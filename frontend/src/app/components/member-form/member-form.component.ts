import { HistoryIconComponent } from '@eagami/ui';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { merge } from 'rxjs';
import { debounceTime } from 'rxjs/operators';

import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
} from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import { BasicDialogComponent } from '@app/components/basic-dialog/basic-dialog.component';
import { DatePickerComponent } from '@app/components/date-picker/date-picker.component';
import { FormErrorIconComponent } from '@app/components/form-error-icon/form-error-icon.component';
import { ModificationInfoComponent } from '@app/components/modification-info/modification-info.component';
import { SafeModeNoticeComponent } from '@app/components/safe-mode-notice/safe-mode-notice.component';
import { TooltipDirective } from '@app/directives/tooltip.directive';
import {
  BasicDialogResult,
  Dialog,
  Id,
  Member,
  MemberFormData,
  MemberFormGroup,
} from '@app/models';
import { DialogService } from '@app/services';
import {
  emailValidator,
  phoneNumberValidator,
  ratingValidator,
  textValidator,
  yearOfBirthValidator,
} from '@app/validators';

@UntilDestroy()
@Component({
  selector: 'lcc-member-form',
  templateUrl: './member-form.component.html',
  styleUrl: './member-form.component.scss',
  imports: [
    DatePickerComponent,
    FormErrorIconComponent,
    HistoryIconComponent,
    ModificationInfoComponent,
    ReactiveFormsModule,
    SafeModeNoticeComponent,
    TooltipDirective,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MemberFormComponent implements OnInit {
  @Input({ required: true }) formData!: MemberFormData;
  @Input({ required: true }) hasUnsavedChanges!: boolean;
  @Input({ required: true }) isSafeMode!: boolean;
  @Input({ required: true }) originalMember!: Member | null;

  @Output() cancel = new EventEmitter<void>();
  @Output() change = new EventEmitter<{
    memberId: Id | null;
    formData: Partial<MemberFormData>;
  }>();
  @Output() requestAddMember = new EventEmitter<{ notifyMember: boolean }>();
  @Output() requestUpdateMember = new EventEmitter<{
    memberId: Id;
    notifyMember: boolean;
  }>();
  @Output() restore = new EventEmitter<Id | null>();

  public form!: FormGroup<MemberFormGroup>;
  // Kept out of the form group, so the choice is never saved with the member or
  // counted as an unsaved change. Only the editor shows it: a new member is always
  // emailed once their email address and year of birth are filled in
  public notifyMember = this.createNotifyMemberControl();

  // A member with an account changes their email address from the account page
  protected get isEmailManagedByAccount(): boolean {
    return this.originalMember?.hasAccount === true;
  }

  protected get notifyMemberLabel(): string {
    return this.originalMember?.hasAccount
      ? 'Email the member about these changes'
      : "Create the member's account and email them their login details";
  }

  constructor(
    private readonly dialogService: DialogService,
    private readonly formBuilder: FormBuilder,
  ) {}

  public ngOnInit(): void {
    this.initForm();
    this.initFormValueChangeListener();

    if (this.hasUnsavedChanges) {
      this.form.markAllAsTouched();
    }
  }

  public async onRestore(): Promise<void> {
    const dialog: Dialog = {
      title: 'Confirm',
      body: 'Restore original member data? All changes will be lost.',
      confirmButtonText: 'Restore',
      confirmButtonType: 'warning',
    };

    const dialogResult = await this.dialogService.open<
      BasicDialogComponent,
      BasicDialogResult
    >({
      componentType: BasicDialogComponent,
      inputs: { dialog },
      isModal: false,
    });

    if (dialogResult !== 'confirm') {
      return;
    }

    this.restore.emit(this.originalMember?.id ?? null);

    setTimeout(() => this.ngOnInit());
  }

  public onCancel(): void {
    this.cancel.emit();
  }

  public async onSubmit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const notifyMember = this.notifyMember.value;
    const dialog: Dialog = {
      title: 'Confirm',
      body: this.getConfirmationMessage(notifyMember),
      confirmButtonText: this.originalMember ? 'Update' : 'Add',
    };

    const result = await this.dialogService.open<BasicDialogComponent, BasicDialogResult>(
      {
        componentType: BasicDialogComponent,
        inputs: { dialog },
        isModal: false,
      },
    );

    if (result !== 'confirm') {
      return;
    }

    if (this.originalMember) {
      this.requestUpdateMember.emit({ memberId: this.originalMember.id, notifyMember });
    } else {
      this.requestAddMember.emit({ notifyMember });
    }
  }

  private getConfirmationMessage(notifyMember: boolean): string {
    if (!this.originalMember) {
      const name = `${this.formData.firstName} ${this.formData.lastName}`;
      return notifyMember
        ? `Add ${name} and email them their login details?`
        : `Add ${name}?`;
    }

    const name = `${this.originalMember.firstName} ${this.originalMember.lastName}`;
    if (!notifyMember) {
      return `Update ${name}?`;
    }
    return this.originalMember.hasAccount
      ? `Update ${name} and email them the changes?`
      : `Update ${name}, create their account and email them their login details?`;
  }

  private initForm(): void {
    this.form = this.formBuilder.group<MemberFormGroup>({
      firstName: new FormControl(this.formData.firstName, {
        nonNullable: true,
        validators: [Validators.required, textValidator],
      }),
      lastName: new FormControl(this.formData.lastName, {
        nonNullable: true,
        validators: [Validators.required, textValidator],
      }),
      city: new FormControl(this.formData.city, {
        nonNullable: true,
        validators: [Validators.required, textValidator],
      }),
      rating: new FormControl(this.formData.rating, {
        nonNullable: true,
        validators: [Validators.required, ratingValidator],
      }),
      dateJoined: new FormControl(this.formData.dateJoined, {
        nonNullable: true,
        validators: [Validators.required],
      }),
      email: new FormControl(
        { value: this.formData.email, disabled: this.isEmailManagedByAccount },
        { nonNullable: true, validators: emailValidator },
      ),
      phoneNumber: new FormControl(this.formData.phoneNumber, {
        nonNullable: true,
        validators: phoneNumberValidator,
      }),
      yearOfBirth: new FormControl(this.formData.yearOfBirth, {
        nonNullable: true,
        validators: yearOfBirthValidator,
      }),
      chessComUsername: new FormControl(this.formData.chessComUsername, {
        nonNullable: true,
        validators: textValidator,
      }),
      lichessUsername: new FormControl(this.formData.lichessUsername, {
        nonNullable: true,
        validators: textValidator,
      }),
      isActive: new FormControl(this.formData.isActive, { nonNullable: true }),
      peakRating: new FormControl(this.formData.peakRating, { nonNullable: true }),
    });

    this.notifyMember = this.createNotifyMemberControl();
    this.syncNotifyMember();
  }

  private createNotifyMemberControl(): FormControl<boolean> {
    return new FormControl({ value: false, disabled: true }, { nonNullable: true });
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

  private initFormValueChangeListener(): void {
    this.form.valueChanges
      .pipe(debounceTime(250), untilDestroyed(this))
      .subscribe((formData: Partial<MemberFormData>) =>
        this.change.emit({
          memberId: this.originalMember?.id ?? null,
          formData,
        }),
      );

    merge(
      this.form.controls.email.valueChanges,
      this.form.controls.yearOfBirth.valueChanges,
    )
      .pipe(untilDestroyed(this))
      .subscribe(() => this.syncNotifyMember());

    // Manually trigger form data change to pass initial form data to store
    this.form.updateValueAndValidity();
  }
}
