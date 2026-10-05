import {
  CardComponent,
  CheckboxComponent,
  DatePickerComponent,
  DialogService,
  DividerComponent,
  InputComponent,
  TooltipDirective,
} from '@eagami/ui';
import { pick } from 'lodash';
import { merge } from 'rxjs';
import { debounceTime } from 'rxjs/operators';

import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  inject,
  input,
  output,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { BasicDialogComponent } from '@app/components/basic-dialog/basic-dialog.component';
import { FormActionsComponent } from '@app/components/form-actions/form-actions.component';
import { ModificationInfoComponent } from '@app/components/modification-info/modification-info.component';
import { SafeModeNoticeComponent } from '@app/components/safe-mode-notice/safe-mode-notice.component';
import { MEMBER_FORM_DATA_PROPERTIES, initialMemberFormData } from '@app/constants';
import {
  FORM_CHANGE_DEBOUNCE,
  FORM_ERROR_MESSAGES,
  WEEK_STARTS_ON,
} from '@app/constants/forms';
import { MEMBER_DETAIL_RULES } from '@app/constants/member-details';
import {
  Dialog,
  Id,
  IsoDate,
  Member,
  MemberFormData,
  MemberFormGroup,
  MemberFormValue,
} from '@app/models';
import { StoreRequestService } from '@app/services';
import { MembersActions } from '@app/store/members';
import {
  fromClubDateTime,
  normalizePhoneNumber,
  toClubDateTime,
  toDayString,
} from '@app/utils';
import {
  emailValidator,
  ratingValidator,
  textValidator,
  yearOfBirthValidator,
} from '@app/validators';

@Component({
  selector: 'lcc-member-form',
  templateUrl: './member-form.component.html',
  styleUrl: './member-form.component.scss',
  imports: [
    CardComponent,
    CheckboxComponent,
    DatePickerComponent,
    DividerComponent,
    FormActionsComponent,
    InputComponent,
    ModificationInfoComponent,
    ReactiveFormsModule,
    SafeModeNoticeComponent,
    TooltipDirective,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MemberFormComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly dialogService = inject(DialogService);
  private readonly storeRequests = inject(StoreRequestService);

  readonly formData = input.required<MemberFormData>();
  readonly hasUnsavedChanges = input.required<boolean>();
  readonly isSafeMode = input.required<boolean>();
  readonly originalMember = input.required<Member | null>();

  readonly cancel = output<void>();
  readonly change = output<{
    memberId: Id | null;
    formData: Partial<MemberFormData>;
  }>();
  readonly restore = output<Id | null>();

  protected readonly chessComUsernameErrorMessages = {
    pattern: MEMBER_DETAIL_RULES.chessComUsername.message,
  };
  protected readonly errorMessages = FORM_ERROR_MESSAGES;
  protected readonly lichessUsernameErrorMessages = {
    pattern: MEMBER_DETAIL_RULES.lichessUsername.message,
  };
  protected readonly phoneNumberErrorMessages = {
    pattern: MEMBER_DETAIL_RULES.phoneNumber.message,
  };
  protected readonly weekStartsOn = WEEK_STARTS_ON;

  public form!: FormGroup<MemberFormGroup>;
  // Kept out of the form group, so the choice is never saved with the member or
  // counted as an unsaved change. Only the editor shows it: a new member is always
  // emailed once their email address and year of birth are filled in
  public readonly notifyMember = new FormControl(
    { value: false, disabled: true },
    { nonNullable: true },
  );

  // A member with an account changes their email address from the account page
  protected get isEmailManagedByAccount(): boolean {
    return this.originalMember()?.hasAccount === true;
  }

  protected get notifyMemberLabel(): string {
    return this.originalMember()?.hasAccount
      ? 'Email the member about these changes'
      : "Create the member's account and email them their login details";
  }

  public ngOnInit(): void {
    this.form = this.buildForm(this.formData());
    this.syncNotifyMember();

    this.form.valueChanges
      .pipe(debounceTime(FORM_CHANGE_DEBOUNCE), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.emitChange());

    merge(
      this.form.controls.email.valueChanges,
      this.form.controls.yearOfBirth.valueChanges,
    )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.syncNotifyMember());

    if (this.hasUnsavedChanges()) {
      this.form.markAllAsTouched();
    }
  }

  public onRestore(): void {
    const originalMember = this.originalMember();
    this.restore.emit(originalMember?.id ?? null);
    this.form.reset(
      this.toFormValue(
        originalMember
          ? pick(originalMember, MEMBER_FORM_DATA_PROPERTIES)
          : initialMemberFormData(),
      ),
    );
  }

  public onCancel(): void {
    this.cancel.emit();
  }

  // A click that leaves the page starts by leaving a field, so the draft is saved first
  public onFieldLeft(): void {
    this.normalizePhoneNumberField();
    this.emitChange();
  }

  public async onSubmit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    // The draft reaches the store after a pause in typing, and saving reads it from there
    this.normalizePhoneNumberField();
    this.emitChange();

    const notifyMember = this.notifyMember.value;
    const dialog: Dialog = {
      title: 'Confirm',
      body: this.getConfirmationMessage(notifyMember),
      confirmButtonText: this.originalMember() ? 'Update' : 'Add',
      confirmAction: () => this.save(notifyMember),
    };

    await this.dialogService.open(BasicDialogComponent, { inputs: { dialog } }).result;
  }

  private save(notifyMember: boolean): Promise<unknown> {
    const originalMember = this.originalMember();
    return originalMember
      ? this.storeRequests.dispatch(
          MembersActions.updateMemberRequested({
            memberId: originalMember.id,
            notifyMember,
          }),
          [MembersActions.updateMemberSucceeded, MembersActions.updateMemberFailed],
        )
      : this.storeRequests.dispatch(MembersActions.addMemberRequested({ notifyMember }), [
          MembersActions.addMemberSucceeded,
          MembersActions.addMemberFailed,
        ]);
  }

  private getConfirmationMessage(notifyMember: boolean): string {
    const originalMember = this.originalMember();
    if (!originalMember) {
      const { firstName, lastName } = this.form.getRawValue();
      const name = `${firstName} ${lastName}`;
      return notifyMember
        ? `Add ${name} and email them their login details?`
        : `Add ${name}?`;
    }

    const name = `${originalMember.firstName} ${originalMember.lastName}`;
    if (!notifyMember) {
      return `Update ${name}?`;
    }
    return originalMember.hasAccount
      ? `Update ${name} and email them the changes?`
      : `Update ${name}, create their account and email them their login details?`;
  }

  private toFormValue(data: MemberFormData): MemberFormValue {
    return {
      ...data,
      dateJoined: data.dateJoined ? toClubDateTime(data.dateJoined).day : null,
    };
  }

  private buildForm(data: MemberFormData): FormGroup<MemberFormGroup> {
    const value = this.toFormValue(data);
    return new FormGroup<MemberFormGroup>({
      firstName: new FormControl(value.firstName, {
        nonNullable: true,
        validators: [Validators.required, textValidator],
      }),
      lastName: new FormControl(value.lastName, {
        nonNullable: true,
        validators: [Validators.required, textValidator],
      }),
      city: new FormControl(value.city, {
        nonNullable: true,
        validators: [Validators.required, textValidator],
      }),
      rating: new FormControl(value.rating, {
        nonNullable: true,
        validators: [Validators.required, ratingValidator],
      }),
      dateJoined: new FormControl<Date | null>(value.dateJoined, Validators.required),
      email: new FormControl(
        { value: value.email, disabled: this.isEmailManagedByAccount },
        { nonNullable: true, validators: emailValidator },
      ),
      phoneNumber: new FormControl(value.phoneNumber, {
        nonNullable: true,
        validators: Validators.pattern(MEMBER_DETAIL_RULES.phoneNumber.pattern),
      }),
      yearOfBirth: new FormControl(value.yearOfBirth, {
        nonNullable: true,
        validators: yearOfBirthValidator,
      }),
      chessComUsername: new FormControl(value.chessComUsername, {
        nonNullable: true,
        validators: Validators.pattern(MEMBER_DETAIL_RULES.chessComUsername.pattern),
      }),
      lichessUsername: new FormControl(value.lichessUsername, {
        nonNullable: true,
        validators: Validators.pattern(MEMBER_DETAIL_RULES.lichessUsername.pattern),
      }),
      isActive: new FormControl(value.isActive, { nonNullable: true }),
      peakRating: new FormControl(value.peakRating, { nonNullable: true }),
    });
  }

  // Emailing the member needs a valid email address and year of birth, and is offered
  // by default as soon as both are filled in
  private syncNotifyMember(): void {
    const { email, yearOfBirth } = this.form.controls;
    const canNotify =
      !!email.value && !email.errors && !!yearOfBirth.value && !yearOfBirth.errors;

    if (canNotify && this.notifyMember.disabled) {
      this.notifyMember.enable();
      this.notifyMember.setValue(true);
    } else if (!canNotify && this.notifyMember.enabled) {
      this.notifyMember.setValue(false);
      this.notifyMember.disable();
    }
  }

  // An unchanged day keeps the instant it was saved with, so opening a member never
  // counts as an edit. A newly picked day starts at midnight on the club clock
  private toDateJoined(day: Date | null): IsoDate | null {
    if (!day) {
      return null;
    }

    const pickedDay = toDayString(day);
    const savedInstant = [
      this.originalMember()?.dateJoined,
      this.formData().dateJoined,
    ].find(
      instant => !!instant && toDayString(toClubDateTime(instant).day) === pickedDay,
    );
    return savedInstant ?? fromClubDateTime(day, '00:00');
  }

  private normalizePhoneNumberField(): void {
    const { phoneNumber } = this.form.controls;
    const normalized = normalizePhoneNumber(phoneNumber.value);
    if (normalized !== phoneNumber.value) {
      phoneNumber.setValue(normalized);
    }
  }

  // Only an edit makes a draft, so opening a form changes nothing in the store
  private emitChange(): void {
    if (!this.form.dirty) {
      return;
    }
    const { dateJoined: day, ...fields } = this.form.getRawValue();
    const dateJoined = this.toDateJoined(day);
    this.change.emit({
      memberId: this.originalMember()?.id ?? null,
      formData: dateJoined ? { ...fields, dateJoined } : fields,
    });
  }
}
