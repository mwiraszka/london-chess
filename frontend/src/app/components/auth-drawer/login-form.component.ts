import {
  ButtonComponent,
  CodeInputComponent,
  InputComponent,
  ToastService,
} from '@eagami/ui';

import {
  ChangeDetectionStrategy,
  Component,
  type ElementRef,
  type OnDestroy,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import { AuthDrawerService } from '@app/services/auth-drawer.service';
import { ClerkService } from '@app/services/clerk.service';
import { EMAIL_REGEX } from '@app/utils/email.util';

@Component({
  selector: 'lcc-login-form',
  templateUrl: './login-form.component.html',
  styleUrl: './auth-form.component.scss',
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [FormsModule, ButtonComponent, CodeInputComponent, InputComponent],
})
export class LoginFormComponent implements OnDestroy {
  private readonly clerk = inject(ClerkService);
  protected readonly authDrawer = inject(AuthDrawerService);
  private readonly toast = inject(ToastService);

  private readonly codeInput = viewChild<ElementRef>('codeInput');

  email = this.authDrawer.loginDraft.email;
  password = this.authDrawer.loginDraft.password;

  verificationCode = signal('');
  newPassword = signal('');
  confirmNewPassword = signal('');

  ngOnDestroy(): void {
    this.password.set('');
    this.newPassword.set('');
    this.confirmNewPassword.set('');
  }

  emailError = signal('');
  passwordError = signal('');
  verificationCodeError = signal('');
  newPasswordError = signal('');
  confirmNewPasswordError = signal('');
  error = signal('');
  loading = signal(false);
  pendingSecondFactor = signal(false);
  pendingNewPassword = signal(false);

  onEmailChange(value: string): void {
    this.email.set(value);
    if (this.emailError() && EMAIL_REGEX.test(value)) {
      this.emailError.set('');
    }
  }

  onPasswordChange(value: string): void {
    this.password.set(value);
    if (this.passwordError() && value) {
      this.passwordError.set('');
    }
  }

  onNewPasswordChange(value: string): void {
    this.newPassword.set(value);
    if (this.newPasswordError() && value.length >= 8) {
      this.newPasswordError.set('');
    }
    if (this.confirmNewPasswordError() && this.confirmNewPassword() === value) {
      this.confirmNewPasswordError.set('');
    }
  }

  onConfirmNewPasswordChange(value: string): void {
    this.confirmNewPassword.set(value);
    if (this.confirmNewPasswordError() && value === this.newPassword()) {
      this.confirmNewPasswordError.set('');
    }
  }

  onEmailBlur(): void {
    if (!this.email()) {
      return;
    }
    this.emailError.set(
      EMAIL_REGEX.test(this.email()) ? '' : 'Please enter a valid email address',
    );
  }

  onNewPasswordBlur(): void {
    if (!this.newPassword()) {
      return;
    }
    this.newPasswordError.set(
      this.newPassword().length >= 8 ? '' : 'Must be at least 8 characters',
    );
  }

  onConfirmNewPasswordBlur(): void {
    if (!this.confirmNewPassword()) {
      return;
    }
    this.confirmNewPasswordError.set(
      !this.newPassword() || this.confirmNewPassword() === this.newPassword()
        ? ''
        : 'Passwords do not match',
    );
  }

  private validateAll(): boolean {
    if (!this.email()) {
      this.emailError.set('Email is required');
    } else if (!EMAIL_REGEX.test(this.email())) {
      this.emailError.set('Please enter a valid email address');
    } else {
      this.emailError.set('');
    }

    if (!this.password()) {
      this.passwordError.set('Password is required');
    } else {
      this.passwordError.set('');
    }

    return !this.emailError() && !this.passwordError();
  }

  private validateNewPassword(): boolean {
    if (!this.newPassword()) {
      this.newPasswordError.set('Password is required');
    } else if (this.newPassword().length < 8) {
      this.newPasswordError.set('Must be at least 8 characters');
    } else {
      this.newPasswordError.set('');
    }

    if (!this.confirmNewPassword()) {
      this.confirmNewPasswordError.set('Please confirm your password');
    } else if (this.newPassword() && this.confirmNewPassword() !== this.newPassword()) {
      this.confirmNewPasswordError.set('Passwords do not match');
    } else {
      this.confirmNewPasswordError.set('');
    }

    return !this.newPasswordError() && !this.confirmNewPasswordError();
  }

  async onVerify(): Promise<void> {
    this.verificationCodeError.set('');
    this.error.set('');
    this.loading.set(true);

    try {
      await this.clerk.verifyLoginCode(this.verificationCode());
      this.authDrawer.clearDrafts();
      this.authDrawer.close();
      this.showWelcomeToast();
    } catch (e: unknown) {
      this.error.set(this.clerk.extractError(e));
    } finally {
      this.loading.set(false);
    }
  }

  async onSetNewPassword(): Promise<void> {
    if (!this.validateNewPassword()) {
      return;
    }

    this.error.set('');
    this.loading.set(true);

    try {
      await this.clerk.completeNewPassword(this.newPassword());
      this.authDrawer.clearDrafts();
      this.authDrawer.close();
      this.showWelcomeToast();
    } catch (e: unknown) {
      this.error.set(this.clerk.extractError(e));
    } finally {
      this.loading.set(false);
    }
  }

  async onSubmit(): Promise<void> {
    if (!this.validateAll()) {
      return;
    }

    this.error.set('');
    this.loading.set(true);

    try {
      const { needsSecondFactor, needsNewPassword } = await this.clerk.logIn(
        this.email(),
        this.password(),
      );

      if (needsSecondFactor) {
        this.pendingSecondFactor.set(true);
        setTimeout(() => this.codeInput()?.nativeElement.querySelector('input')?.focus());
      } else if (needsNewPassword) {
        this.pendingNewPassword.set(true);
      } else {
        this.authDrawer.clearDrafts();
        this.authDrawer.close();
        this.showWelcomeToast();
      }
    } catch (e: unknown) {
      this.error.set(this.clerk.extractError(e));
    } finally {
      this.loading.set(false);
    }
  }

  private showWelcomeToast(): void {
    const firstName = this.clerk.user()?.firstName;
    this.toast.show(firstName ? `Welcome back, ${firstName}!` : 'Welcome back!', {
      title: 'Logged in',
      variant: 'success',
    });
  }
}
