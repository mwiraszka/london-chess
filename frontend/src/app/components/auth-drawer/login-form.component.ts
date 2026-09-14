import {
  ButtonComponent,
  CodeInputComponent,
  InputComponent,
  ToastService,
} from '@eagami/ui';

import {
  ChangeDetectionStrategy,
  Component,
  Injector,
  type OnDestroy,
  afterNextRender,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';

import { NewPasswordFieldsComponent } from '@app/components/new-password-fields/new-password-fields.component';
import { LoginStep } from '@app/models';
import { AuthDrawerService } from '@app/services/auth-drawer.service';
import { ClerkService } from '@app/services/clerk.service';
import { createNewPasswordGroup } from '@app/utils';

@Component({
  selector: 'lcc-login-form',
  templateUrl: './login-form.component.html',
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
export class LoginFormComponent implements OnDestroy {
  protected readonly authDrawer = inject(AuthDrawerService);
  private readonly clerk = inject(ClerkService);
  private readonly injector = inject(Injector);
  private readonly toast = inject(ToastService);

  private readonly codeInput = viewChild(CodeInputComponent);

  protected readonly form = this.authDrawer.loginForm;
  protected readonly newPasswordForm = createNewPasswordGroup();

  protected readonly error = signal('');
  protected readonly loading = signal(false);
  protected readonly step = signal<LoginStep>('credentials');

  ngOnDestroy(): void {
    this.form.controls.password.reset();
  }

  protected async onSubmit(): Promise<void> {
    if (this.form.invalid) {
      return;
    }

    const { email, password } = this.form.getRawValue();
    this.error.set('');
    this.loading.set(true);

    try {
      const { needsSecondFactor, needsNewPassword } = await this.clerk.logIn(
        email,
        password,
      );

      if (needsSecondFactor) {
        this.step.set('second-factor');
        afterNextRender(() => this.codeInput()?.focus(), { injector: this.injector });
      } else if (needsNewPassword) {
        this.step.set('new-password');
      } else {
        this.completeLogin();
      }
    } catch (e: unknown) {
      this.error.set(this.clerk.extractError(e));
    } finally {
      this.loading.set(false);
    }
  }

  protected async onVerify(code: string): Promise<void> {
    this.error.set('');
    this.loading.set(true);

    try {
      await this.clerk.verifyLoginCode(code);
      this.completeLogin();
    } catch (e: unknown) {
      this.error.set(this.clerk.extractError(e));
    } finally {
      this.loading.set(false);
    }
  }

  protected async onSetNewPassword(): Promise<void> {
    if (this.newPasswordForm.invalid) {
      return;
    }

    this.error.set('');
    this.loading.set(true);

    try {
      await this.clerk.completeNewPassword(
        this.newPasswordForm.controls.newPassword.value,
      );
      this.completeLogin();
    } catch (e: unknown) {
      this.error.set(this.clerk.extractError(e));
    } finally {
      this.loading.set(false);
    }
  }

  private completeLogin(): void {
    this.authDrawer.resetForms();
    this.authDrawer.close();

    const firstName = this.clerk.user()?.firstName;
    this.toast.show(firstName ? `Welcome back, ${firstName}!` : 'Welcome back!', {
      title: 'Logged in',
      variant: 'success',
    });
  }
}
