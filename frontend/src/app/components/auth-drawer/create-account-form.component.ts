import {
  ButtonComponent,
  InputComponent,
  LockIconComponent,
  ToastService,
} from '@eagami/ui';

import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';

import { ChessUsernameFieldsComponent } from '@app/components/chess-username-fields/chess-username-fields.component';
import { PhoneNumberFieldComponent } from '@app/components/phone-number-field/phone-number-field.component';
import { YearOfBirthFieldComponent } from '@app/components/year-of-birth-field/year-of-birth-field.component';
import { VERIFICATION_CODE_LENGTH } from '@app/constants/auth';
import { ApiError, ApiService, AuthDrawerService } from '@app/services';
import { createVerificationCodeControl } from '@app/utils';

@Component({
  selector: 'lcc-create-account-form',
  templateUrl: './create-account-form.component.html',
  styleUrls: ['./auth-form.component.scss', './create-account-form.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ButtonComponent,
    ChessUsernameFieldsComponent,
    InputComponent,
    LockIconComponent,
    PhoneNumberFieldComponent,
    ReactiveFormsModule,
    YearOfBirthFieldComponent,
  ],
})
export class CreateAccountFormComponent {
  private readonly api = inject(ApiService);
  protected readonly authDrawer = inject(AuthDrawerService);
  private readonly toast = inject(ToastService);

  protected readonly codeLength = VERIFICATION_CODE_LENGTH;
  protected readonly form = this.authDrawer.createAccountForm;
  protected readonly verificationForm = new FormGroup({
    code: createVerificationCodeControl(),
  });

  protected readonly codeError = signal('');
  protected readonly error = signal('');
  protected readonly loading = signal(false);
  protected readonly step = signal<'form' | 'code'>('form');

  protected async onSubmit(): Promise<void> {
    if (this.form.invalid) {
      return;
    }
    await this.sendVerificationCode();
  }

  protected async onResendCode(): Promise<void> {
    await this.sendVerificationCode();
  }

  protected onBackToForm(): void {
    this.step.set('form');
    this.verificationForm.reset();
    this.codeError.set('');
    this.error.set('');
  }

  protected async onVerifyAndSubmit(): Promise<void> {
    if (this.form.invalid || this.verificationForm.invalid) {
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

    this.error.set('');
    this.codeError.set('');
    this.loading.set(true);

    try {
      await this.api.post('/users/account-requests', {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        yearOfBirth,
        city: city.trim(),
        phoneNumber: phoneNumber.trim(),
        lichessUsername: lichessUsername.trim(),
        chessComUsername: chessComUsername.trim(),
        verificationCode: this.verificationForm.controls.code.value.trim(),
      });

      this.authDrawer.resetForms();
      this.authDrawer.close();
      this.toast.show(
        `Thanks ${firstName.trim()} – your information has been sent for review. We will email you at ${email.trim()} once your account is confirmed.`,
        { title: 'Request sent', variant: 'info' },
      );
    } catch (e: unknown) {
      this.codeError.set(this.toErrorMessage(e));
    } finally {
      this.loading.set(false);
    }
  }

  private async sendVerificationCode(): Promise<void> {
    this.error.set('');
    this.codeError.set('');
    this.loading.set(true);

    try {
      await this.api.post('/users/account-requests/verification', {
        email: this.form.controls.email.value.trim(),
      });
      this.step.set('code');
    } catch (e: unknown) {
      this.error.set(this.toErrorMessage(e));
    } finally {
      this.loading.set(false);
    }
  }

  private toErrorMessage(e: unknown): string {
    return e instanceof ApiError
      ? e.message.replace(/\.$/, '')
      : 'Something went wrong, please try again';
  }
}
