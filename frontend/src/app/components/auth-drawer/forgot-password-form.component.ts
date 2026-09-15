import {
  ButtonComponent,
  CodeInputComponent,
  InputComponent,
  ToastService,
} from '@eagami/ui';

import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { NewPasswordFieldsComponent } from '@app/components/new-password-fields/new-password-fields.component';
import { KeepFocusDirective } from '@app/directives/keep-focus.directive';
import { UserRecord } from '@app/models';
import { ApiError, ApiService } from '@app/services/api.service';
import { AuthDrawerService } from '@app/services/auth-drawer.service';
import { ClerkService } from '@app/services/clerk.service';
import { UserService } from '@app/services/user.service';
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
    KeepFocusDirective,
    NewPasswordFieldsComponent,
    ReactiveFormsModule,
  ],
})
export class ForgotPasswordFormComponent {
  protected readonly authDrawer = inject(AuthDrawerService);
  private readonly api = inject(ApiService);
  private readonly clerk = inject(ClerkService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly userService = inject(UserService);

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
    this.authDrawer.isCompletingLogin.set(true);

    try {
      const isLoggedIn = await this.clerk.resetPassword(code, passwords.newPassword);
      if (!isLoggedIn) {
        this.authDrawer.setMode('login');
        return;
      }

      // The new password replaces any temporary one the site emailed
      await this.userService.load();
      if (this.userService.user()?.hasTemporaryPassword) {
        this.userService.setUser(
          await this.api.post<UserRecord>('/users/me/password/confirm', {
            password: passwords.newPassword,
          }),
        );
      }

      this.authDrawer.resetForms();
      this.authDrawer.close();
      void this.router.navigateByUrl('/');
      this.toast.show('Your new password is set and you are now logged in.', {
        title: 'Password reset',
        variant: 'success',
      });
    } catch (e: unknown) {
      this.error.set(e instanceof ApiError ? e.message : this.clerk.extractError(e));
    } finally {
      this.authDrawer.isCompletingLogin.set(false);
      this.loading.set(false);
    }
  }
}
