import { ButtonComponent, CodeInputComponent, InputComponent } from '@eagami/ui';

import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';

import { NewPasswordFieldsComponent } from '@app/components/new-password-fields/new-password-fields.component';
import { AuthDrawerService } from '@app/services/auth-drawer.service';
import { ClerkService } from '@app/services/clerk.service';
import {
  createEmailControl,
  createNewPasswordGroup,
  createVerificationCodeControl,
} from '@app/utils';

@Component({
  selector: 'lcc-forgot-password-form',
  templateUrl: './forgot-password-form.component.html',
  styleUrl: './auth-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ButtonComponent,
    CodeInputComponent,
    InputComponent,
    NewPasswordFieldsComponent,
    ReactiveFormsModule,
  ],
})
export class ForgotPasswordFormComponent {
  protected readonly authDrawer = inject(AuthDrawerService);
  private readonly clerk = inject(ClerkService);

  protected readonly emailForm = new FormGroup({ email: createEmailControl() });
  protected readonly resetForm = new FormGroup({
    code: createVerificationCodeControl(),
    passwords: createNewPasswordGroup(),
  });

  protected readonly codeSent = signal(false);
  protected readonly error = signal('');
  protected readonly loading = signal(false);

  protected async onSendCode(): Promise<void> {
    if (this.emailForm.invalid) {
      return;
    }

    this.error.set('');
    this.loading.set(true);

    try {
      await this.clerk.sendPasswordResetCode(this.emailForm.controls.email.value);
      this.codeSent.set(true);
    } catch (e: unknown) {
      this.error.set(this.clerk.extractError(e));
    } finally {
      this.loading.set(false);
    }
  }

  protected async onResetPassword(): Promise<void> {
    if (this.resetForm.invalid) {
      return;
    }

    const { code, passwords } = this.resetForm.getRawValue();
    this.error.set('');
    this.loading.set(true);

    try {
      await this.clerk.resetPassword(code, passwords.newPassword);
      this.authDrawer.setMode('login');
    } catch (e: unknown) {
      this.error.set(this.clerk.extractError(e));
    } finally {
      this.loading.set(false);
    }
  }
}
