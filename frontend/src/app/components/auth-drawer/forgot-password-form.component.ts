import { ButtonComponent, CodeInputComponent, InputComponent } from '@eagami/ui';

import {
  ChangeDetectionStrategy,
  Component,
  type OnDestroy,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import { PasswordRequirementsComponent } from '@app/components/password-requirements/password-requirements.component';
import { AuthDrawerService } from '@app/services/auth-drawer.service';
import { ClerkService } from '@app/services/clerk.service';
import { EMAIL_REGEX } from '@app/utils/email.util';
import { meetsPasswordRequirements } from '@app/utils/password.util';

const RESET_CODE_LENGTH = 6;

@Component({
  selector: 'lcc-forgot-password-form',
  templateUrl: './forgot-password-form.component.html',
  styleUrl: './auth-form.component.scss',
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [
    FormsModule,
    ButtonComponent,
    CodeInputComponent,
    InputComponent,
    PasswordRequirementsComponent,
  ],
})
export class ForgotPasswordFormComponent implements OnDestroy {
  private readonly clerk = inject(ClerkService);
  protected readonly authDrawer = inject(AuthDrawerService);

  email = signal('');
  code = signal('');
  newPassword = signal('');
  confirmPassword = signal('');

  emailError = signal('');
  error = signal('');
  loading = signal(false);
  codeSent = signal(false);

  protected readonly canSendCode = computed(() => EMAIL_REGEX.test(this.email().trim()));

  protected readonly confirmMismatch = computed(
    () =>
      this.confirmPassword().length > 0 && this.confirmPassword() !== this.newPassword(),
  );

  protected readonly canReset = computed(
    () =>
      this.code().length === RESET_CODE_LENGTH &&
      meetsPasswordRequirements(this.newPassword()) &&
      this.newPassword() === this.confirmPassword(),
  );

  ngOnDestroy(): void {
    this.newPassword.set('');
    this.confirmPassword.set('');
  }

  onEmailChange(value: string): void {
    this.email.set(value);
    if (this.emailError() && EMAIL_REGEX.test(value)) {
      this.emailError.set('');
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

  async onSendCode(): Promise<void> {
    if (!this.email()) {
      this.emailError.set('Email is required');
      return;
    }
    if (!EMAIL_REGEX.test(this.email())) {
      this.emailError.set('Please enter a valid email address');
      return;
    }
    this.emailError.set('');

    this.error.set('');
    this.loading.set(true);

    try {
      await this.clerk.sendPasswordResetCode(this.email());
      this.codeSent.set(true);
    } catch (e: unknown) {
      this.error.set(this.clerk.extractError(e));
    } finally {
      this.loading.set(false);
    }
  }

  async onResetPassword(): Promise<void> {
    if (!this.canReset()) {
      return;
    }

    this.error.set('');
    this.loading.set(true);

    try {
      await this.clerk.resetPassword(this.code(), this.newPassword());
      this.authDrawer.setMode('login');
    } catch (e: unknown) {
      this.error.set(this.clerk.extractError(e));
    } finally {
      this.loading.set(false);
    }
  }
}
