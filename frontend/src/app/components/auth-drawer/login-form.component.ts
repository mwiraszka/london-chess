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
import { ApiError, ApiService } from '@app/services/api.service';
import { AuthDrawerService } from '@app/services/auth-drawer.service';
import { ClerkService } from '@app/services/clerk.service';
import { UserService } from '@app/services/user.service';
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
  private readonly api = inject(ApiService);
  private readonly clerk = inject(ClerkService);
  private readonly injector = inject(Injector);
  private readonly toast = inject(ToastService);
  private readonly userService = inject(UserService);

  private readonly codeInput = viewChild(CodeInputComponent);

  protected readonly form = this.authDrawer.loginForm;
  protected readonly newPasswordForm = createNewPasswordGroup();

  protected readonly error = signal('');
  protected readonly loading = signal(false);
  protected readonly step = signal<LoginStep>('credentials');

  ngOnDestroy(): void {
    this.form.controls.password.reset();

    // Closing the drawer partway through a log in ends the session it started, so the
    // site is never used with the password the site emailed
    if (this.authDrawer.isCompletingLogin()) {
      this.authDrawer.isCompletingLogin.set(false);
      if (this.clerk.isLoggedIn()) {
        void this.clerk.logOut();
      }
    }
  }

  protected async onSubmit(): Promise<void> {
    if (this.form.invalid) {
      return;
    }

    const { email, password } = this.form.getRawValue();
    this.error.set('');
    this.loading.set(true);
    this.authDrawer.isCompletingLogin.set(true);

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
        await this.finishLogin();
      }
    } catch (e: unknown) {
      this.authDrawer.isCompletingLogin.set(false);
      this.error.set(this.clerk.extractError(e));
    } finally {
      this.loading.set(false);
    }
  }

  protected async onVerify(code: string): Promise<void> {
    this.error.set('');
    this.loading.set(true);

    try {
      const { needsNewPassword } = await this.clerk.verifyLoginCode(code);
      if (needsNewPassword) {
        this.step.set('new-password');
      } else {
        await this.finishLogin();
      }
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
      const newPassword = this.newPasswordForm.controls.newPassword.value;
      if (this.userService.user()?.hasTemporaryPassword) {
        await this.api.post('/users/me/password', {
          currentPassword: this.form.controls.password.value,
          newPassword,
        });
        await this.userService.load();
      } else {
        await this.clerk.completeNewPassword(newPassword);
      }
      this.completeLogin();
    } catch (e: unknown) {
      this.error.set(e instanceof ApiError ? e.message : this.clerk.extractError(e));
    } finally {
      this.loading.set(false);
    }
  }

  // A member still on the password the site emailed sets their own before finishing
  private async finishLogin(): Promise<void> {
    await this.userService.load();
    if (this.userService.user()?.hasTemporaryPassword) {
      this.step.set('new-password');
    } else {
      this.completeLogin();
    }
  }

  private completeLogin(): void {
    this.authDrawer.isCompletingLogin.set(false);
    this.authDrawer.resetForms();
    this.authDrawer.close();

    const firstName = this.clerk.user()?.firstName;
    this.toast.show(firstName ? `Welcome back, ${firstName}!` : 'Welcome back!', {
      title: 'Logged in',
      variant: 'success',
    });
  }
}
