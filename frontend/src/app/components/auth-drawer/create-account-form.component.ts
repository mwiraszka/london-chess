import {
  ButtonComponent,
  DividerComponent,
  InputComponent,
  NumberInputComponent,
  ShieldIconComponent,
  ToastService,
} from '@eagami/ui';

import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import { FieldLabelWithHelpComponent } from '@app/components/field-label-with-help/field-label-with-help.component';
import { ChesscomLogoComponent } from '@app/components/platform-logos/chesscom-logo.component';
import { LichessLogoComponent } from '@app/components/platform-logos/lichess-logo.component';
import { ApiError, ApiService, AuthDrawerService } from '@app/services';
import { EMAIL_REGEX } from '@app/utils/email.util';

const MIN_YEAR_OF_BIRTH = 1900;

@Component({
  selector: 'lcc-create-account-form',
  templateUrl: './create-account-form.component.html',
  styleUrls: ['./auth-form.component.scss', './create-account-form.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [
    FieldLabelWithHelpComponent,
    ButtonComponent,
    DividerComponent,
    FormsModule,
    InputComponent,
    NumberInputComponent,
    ShieldIconComponent,
  ],
})
export class CreateAccountFormComponent {
  private readonly api = inject(ApiService);
  protected readonly authDrawer = inject(AuthDrawerService);
  private readonly toast = inject(ToastService);

  protected readonly minYearOfBirth = MIN_YEAR_OF_BIRTH;
  protected readonly currentYear = new Date().getFullYear();

  protected readonly lichessLogo = LichessLogoComponent;
  protected readonly chesscomLogo = ChesscomLogoComponent;

  firstName = signal('');
  lastName = signal('');
  email = signal('');
  yearOfBirth = signal<number | null>(null);
  city = signal('');
  phoneNumber = signal('');
  lichessUsername = signal('');
  chessComUsername = signal('');

  protected readonly phoneError = computed(() => {
    const value = this.phoneNumber().trim();
    return !value || /^[0-9()+\-. ]{7,20}$/.test(value)
      ? ''
      : 'Phone number must be 7 to 20 characters using digits, spaces, and ()+-. only.';
  });

  protected readonly lichessError = computed(() => {
    const value = this.lichessUsername().trim();
    return !value || /^[a-zA-Z0-9_-]{2,20}$/.test(value)
      ? ''
      : 'Lichess username must be 2 to 20 letters, numbers, hyphens, or underscores.';
  });

  protected readonly chessComError = computed(() => {
    const value = this.chessComUsername().trim();
    return !value || /^[a-zA-Z0-9_-]{3,25}$/.test(value)
      ? ''
      : 'Chess.com username must be 3 to 25 letters, numbers, hyphens, or underscores.';
  });

  emailError = signal('');
  error = signal('');
  loading = signal(false);

  step = signal<'form' | 'code'>('form');
  verificationCode = signal('');
  codeError = signal('');

  protected readonly canSubmit = computed(() => {
    const year = this.yearOfBirth();
    return (
      !!this.firstName().trim() &&
      !!this.lastName().trim() &&
      EMAIL_REGEX.test(this.email()) &&
      year !== null &&
      year >= MIN_YEAR_OF_BIRTH &&
      year <= this.currentYear &&
      !!this.city().trim() &&
      !this.phoneError() &&
      !this.lichessError() &&
      !this.chessComError()
    );
  });

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

  async onSubmit(): Promise<void> {
    if (!this.canSubmit()) {
      return;
    }
    await this.sendVerificationCode(true);
  }

  async onResendCode(): Promise<void> {
    await this.sendVerificationCode(false);
  }

  onBackToForm(): void {
    this.step.set('form');
    this.verificationCode.set('');
    this.codeError.set('');
    this.error.set('');
  }

  private async sendVerificationCode(advance: boolean): Promise<void> {
    this.error.set('');
    this.codeError.set('');
    this.loading.set(true);
    try {
      await this.api.post('/users/account-requests/verification', {
        email: this.email().trim(),
      });
      if (advance) {
        this.step.set('code');
      }
    } catch (e: unknown) {
      this.error.set(
        e instanceof ApiError
          ? e.message.replace(/\.$/, '')
          : 'Something went wrong, please try again',
      );
    } finally {
      this.loading.set(false);
    }
  }

  async onVerifyAndSubmit(): Promise<void> {
    const year = this.yearOfBirth();
    if (year === null || this.verificationCode().trim().length !== 6) {
      return;
    }

    this.error.set('');
    this.codeError.set('');
    this.loading.set(true);

    try {
      await this.api.post('/users/account-requests', {
        firstName: this.firstName().trim(),
        lastName: this.lastName().trim(),
        email: this.email().trim(),
        yearOfBirth: year,
        city: this.city().trim(),
        phoneNumber: this.phoneNumber().trim(),
        lichessUsername: this.lichessUsername().trim(),
        chessComUsername: this.chessComUsername().trim(),
        verificationCode: this.verificationCode().trim(),
      });

      this.authDrawer.close();
      this.toast.show(
        `Thanks ${this.firstName().trim()} – your information has been sent for review. We will email you at ${this.email().trim()} once your account is confirmed.`,
        { title: 'Request sent', variant: 'info' },
      );
    } catch (e: unknown) {
      this.codeError.set(
        e instanceof ApiError
          ? e.message.replace(/\.$/, '')
          : 'Something went wrong, please try again',
      );
    } finally {
      this.loading.set(false);
    }
  }
}
