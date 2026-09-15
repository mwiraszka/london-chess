import {
  ButtonComponent,
  CodeInputComponent,
  LockIconComponent,
  ToastService,
} from '@eagami/ui';

import {
  ChangeDetectionStrategy,
  Component,
  Injector,
  afterNextRender,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';

import { MemberAccountFieldsComponent } from '@app/components/member-account-fields/member-account-fields.component';
import { VERIFICATION_CODE_LENGTH } from '@app/constants/auth';
import { KeepFocusDirective } from '@app/directives/keep-focus.directive';
import { ApiError, ApiService, AuthDrawerService } from '@app/services';
import { createVerificationCodeControl } from '@app/utils';

@Component({
  selector: 'lcc-create-account-form',
  templateUrl: './create-account-form.component.html',
  styleUrls: ['./auth-form.component.scss', './create-account-form.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ButtonComponent,
    CodeInputComponent,
    KeepFocusDirective,
    LockIconComponent,
    MemberAccountFieldsComponent,
    ReactiveFormsModule,
  ],
})
export class CreateAccountFormComponent {
  private readonly api = inject(ApiService);
  protected readonly authDrawer = inject(AuthDrawerService);
  private readonly injector = inject(Injector);
  private readonly toast = inject(ToastService);

  private readonly codeInput = viewChild(CodeInputComponent);

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
      this.toast.show(`We'll email ${email.trim()} once your account is ready.`, {
        title: 'Request sent',
        variant: 'success',
        duration: 0,
      });
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
      this.showCodeStep();
    } catch (e: unknown) {
      // A code already sent to this address is still valid, so the visitor can enter it
      if (e instanceof ApiError && e.status === 429) {
        this.showCodeStep();
        this.toast.show(e.message, { title: 'Code already sent', variant: 'info' });
      } else {
        this.error.set(this.toErrorMessage(e));
      }
    } finally {
      this.loading.set(false);
    }
  }

  private showCodeStep(): void {
    this.step.set('code');
    afterNextRender(() => this.codeInput()?.focus(), { injector: this.injector });
  }

  private toErrorMessage(e: unknown): string {
    return e instanceof ApiError
      ? e.message.replace(/\.$/, '')
      : 'Something went wrong, please try again';
  }
}
