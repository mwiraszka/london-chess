import { ButtonComponent, DialogComponent } from '@eagami/ui';
import { Actions, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';

import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  model,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Validators } from '@angular/forms';

import { MemberAccountFieldsComponent } from '@app/components/member-account-fields/member-account-fields.component';
import { Member } from '@app/models';
import { MembersActions } from '@app/store/members';
import { createMemberAccountGroup } from '@app/utils';

@Component({
  selector: 'lcc-create-member-account-dialog',
  templateUrl: './create-member-account-dialog.component.html',
  styleUrl: './create-member-account-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonComponent, DialogComponent, MemberAccountFieldsComponent],
})
export class CreateMemberAccountDialogComponent {
  readonly member = input.required<Member>();
  readonly open = model(false);

  private readonly actions$ = inject(Actions);
  private readonly store = inject(Store);

  protected readonly form = createMemberAccountGroup();
  protected readonly isResend = computed(() => this.member().accountStatus === 'invited');
  protected readonly sending = signal(false);

  constructor() {
    // Many members have no year of birth on file, and an account does not need one
    this.form.controls.yearOfBirth.removeValidators(Validators.required);

    effect(() => {
      if (this.open()) {
        untracked(() => this.prefill(this.member()));
      }
    });

    this.actions$
      .pipe(
        ofType(
          MembersActions.createMemberAccountSucceeded,
          MembersActions.createMemberAccountFailed,
          MembersActions.requestTimedOut,
        ),
        takeUntilDestroyed(),
      )
      .subscribe(action => {
        this.sending.set(false);
        if (action.type === MembersActions.createMemberAccountSucceeded.type) {
          this.open.set(false);
        }
      });
  }

  protected onSubmit(): void {
    if (this.form.invalid || this.sending()) {
      return;
    }

    const {
      firstName,
      lastName,
      email,
      yearOfBirth,
      city,
      phoneNumber,
      lichessUsername,
      chessComUsername,
    } = this.form.getRawValue();

    this.sending.set(true);
    this.store.dispatch(
      MembersActions.createMemberAccountRequested({
        memberId: this.member().id,
        details: {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim(),
          yearOfBirth: yearOfBirth === null ? '' : String(yearOfBirth),
          city: city.trim(),
          phoneNumber: phoneNumber.trim(),
          lichessUsername: lichessUsername.trim(),
          chessComUsername: chessComUsername.trim(),
        },
      }),
    );
  }

  private prefill(member: Member): void {
    this.form.reset({
      firstName: member.firstName,
      lastName: member.lastName,
      email: member.email,
      yearOfBirth: member.yearOfBirth ? Number(member.yearOfBirth) : null,
      city: member.city,
      phoneNumber: member.phoneNumber,
      lichessUsername: member.lichessUsername,
      chessComUsername: member.chessComUsername,
    });

    // Details on file that fail validation need correcting before the invitation can go out
    for (const control of Object.values(this.form.controls)) {
      if (control.value && control.invalid) {
        control.markAsTouched();
      }
    }
  }
}
