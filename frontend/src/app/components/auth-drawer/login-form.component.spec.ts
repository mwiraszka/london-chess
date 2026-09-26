import { CodeInputComponent, ToastService } from '@eagami/ui';

import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LoginResult } from '@app/models';
import { ApiError, ApiService } from '@app/services/api.service';
import { AuthDrawerService } from '@app/services/auth-drawer.service';
import { ClerkService } from '@app/services/clerk.service';
import { UserService } from '@app/services/user.service';
import { query, queryTextContent } from '@app/utils';

import { LoginFormComponent } from './login-form.component';

describe('LoginFormComponent', () => {
  let fixture: ComponentFixture<LoginFormComponent>;
  let component: LoginFormComponent;
  let authDrawer: AuthDrawerService;

  let logInSpy: Mock<Promise<LoginResult>>;
  let verifyLoginCodeSpy: Mock<Promise<{ needsNewPassword: boolean }>>;
  let completeNewPasswordSpy: Mock<Promise<void>>;
  let logOutSpy: Mock<Promise<void>>;
  let postSpy: Mock;
  let loadSpy: Mock<Promise<void>>;
  let toastSpy: Mock;

  const isLoggedIn = signal(false);
  const clerkUser = signal<{ firstName: string | null } | null>(null);
  const userRecord = signal<{ hasTemporaryPassword: boolean } | null>(null);

  const newPassword = 'Str0ng-password!';

  const submitCredentials = (): Promise<void> => {
    // @ts-expect-error Protected class member
    return component.onSubmit();
  };

  const verify = (code: string): Promise<void> => {
    // @ts-expect-error Protected class member
    return component.onVerify(code);
  };

  const setNewPassword = (): Promise<void> => {
    // @ts-expect-error Protected class member
    return component.onSetNewPassword();
  };

  const fillCredentials = (): void => {
    authDrawer.loginForm.setValue({ email: 'ann@example.com', password: 'Temp-pass1!' });
  };

  const fillNewPassword = (): void => {
    // @ts-expect-error Protected class member
    component.newPasswordForm.setValue({ newPassword, confirmPassword: newPassword });
  };

  const submitForm = (): void => {
    query(fixture.debugElement, 'form').nativeElement.dispatchEvent(new Event('submit'));
  };

  const errorText = (): string => queryTextContent(fixture.debugElement, '.error');

  beforeEach(async () => {
    isLoggedIn.set(false);
    clerkUser.set(null);
    userRecord.set(null);
    logInSpy = vi
      .fn()
      .mockResolvedValue({ needsSecondFactor: false, needsNewPassword: false });
    verifyLoginCodeSpy = vi.fn().mockResolvedValue({ needsNewPassword: false });
    completeNewPasswordSpy = vi.fn().mockResolvedValue(undefined);
    logOutSpy = vi.fn().mockResolvedValue(undefined);
    postSpy = vi.fn().mockResolvedValue(undefined);
    loadSpy = vi.fn().mockResolvedValue(undefined);
    toastSpy = vi.fn();

    await TestBed.configureTestingModule({
      imports: [LoginFormComponent],
      providers: [
        { provide: ApiService, useValue: { post: postSpy } },
        {
          provide: ClerkService,
          useValue: {
            logIn: logInSpy,
            verifyLoginCode: verifyLoginCodeSpy,
            completeNewPassword: completeNewPasswordSpy,
            extractError: () => 'Incorrect email or password',
            isLoggedIn,
            logOut: logOutSpy,
            user: clerkUser,
          },
        },
        { provide: ToastService, useValue: { show: toastSpy } },
        { provide: UserService, useValue: { load: loadSpy, user: userRecord } },
      ],
    }).compileComponents();

    authDrawer = TestBed.inject(AuthDrawerService);
    authDrawer.openLogin();
    fixture = TestBed.createComponent(LoginFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('credentials', () => {
    it('should log in with the entered email and password on submit', () => {
      fillCredentials();

      submitForm();

      expect(logInSpy).toHaveBeenCalledWith('ann@example.com', 'Temp-pass1!');
    });

    it('should not log in with an incomplete form', async () => {
      authDrawer.loginForm.controls.email.setValue('ann@example.com');

      await submitCredentials();

      expect(logInSpy).not.toHaveBeenCalled();
    });

    it('should finish the log in, close the drawer and greet the member', async () => {
      fillCredentials();
      clerkUser.set({ firstName: 'Ann' });

      await submitCredentials();

      expect(loadSpy).toHaveBeenCalled();
      expect(authDrawer.open()).toBe(false);
      expect(authDrawer.isCompletingLogin()).toBe(false);
      expect(authDrawer.loginForm.getRawValue()).toEqual({ email: '', password: '' });
      expect(toastSpy).toHaveBeenCalledWith(
        expect.stringContaining('Ann'),
        expect.objectContaining({ variant: 'success' }),
      );
    });

    it('should greet a member without a first name', async () => {
      fillCredentials();

      await submitCredentials();

      expect(toastSpy).toHaveBeenCalledWith(
        expect.not.stringMatching(/null|undefined/),
        expect.objectContaining({ variant: 'success' }),
      );
    });

    it('should ask a member on a temporary password to choose a new one', async () => {
      fillCredentials();
      userRecord.set({ hasTemporaryPassword: true });

      await submitCredentials();
      fixture.detectChanges();

      expect(authDrawer.open()).toBe(true);
      expect(query(fixture.debugElement, 'lcc-new-password-fields')).toBeTruthy();
    });

    it('should ask for a new password when Clerk requires one', async () => {
      fillCredentials();
      logInSpy.mockResolvedValue({ needsSecondFactor: false, needsNewPassword: true });

      await submitCredentials();
      fixture.detectChanges();

      expect(loadSpy).not.toHaveBeenCalled();
      expect(query(fixture.debugElement, 'lcc-new-password-fields')).toBeTruthy();
    });

    it('should show the error and stop completing the log in when it fails', async () => {
      fillCredentials();
      logInSpy.mockRejectedValue(new Error('rejected'));

      await submitCredentials();
      fixture.detectChanges();

      expect(authDrawer.isCompletingLogin()).toBe(false);
      expect(errorText()).toBe('Incorrect email or password');
    });

    it('should switch to the create account and forgot password forms', () => {
      const [createAccount, forgotPassword] =
        fixture.nativeElement.querySelectorAll('.auth-link__button');

      createAccount.click();
      const afterCreateAccount = authDrawer.mode();
      forgotPassword.click();

      expect(afterCreateAccount).toBe('create-account');
      expect(authDrawer.mode()).toBe('forgot-password');
    });
  });

  describe('second factor', () => {
    beforeEach(() => {
      fillCredentials();
      logInSpy.mockResolvedValue({ needsSecondFactor: true, needsNewPassword: false });
    });

    it('should show and focus the code input', async () => {
      const focusSpy = vi.spyOn(CodeInputComponent.prototype, 'focus');

      await submitCredentials();
      fixture.detectChanges();
      await fixture.whenStable();

      expect(query(fixture.debugElement, 'ea-code-input')).toBeTruthy();
      expect(focusSpy).toHaveBeenCalled();
    });

    it('should verify the code once it is complete', async () => {
      await submitCredentials();
      fixture.detectChanges();

      query(fixture.debugElement, 'ea-code-input').triggerEventHandler(
        'completed',
        '123456',
      );

      expect(verifyLoginCodeSpy).toHaveBeenCalledWith('123456');
    });

    it('should finish the log in once the code is accepted', async () => {
      await submitCredentials();

      await verify('123456');

      expect(loadSpy).toHaveBeenCalled();
      expect(authDrawer.open()).toBe(false);
    });

    it('should ask for a new password after the code when one is required', async () => {
      verifyLoginCodeSpy.mockResolvedValue({ needsNewPassword: true });
      await submitCredentials();

      await verify('123456');
      fixture.detectChanges();

      expect(query(fixture.debugElement, 'lcc-new-password-fields')).toBeTruthy();
    });

    it('should show the error for a rejected code', async () => {
      verifyLoginCodeSpy.mockRejectedValue(new Error('rejected'));
      await submitCredentials();

      await verify('000000');
      fixture.detectChanges();

      expect(query(fixture.debugElement, 'ea-code-input')).toBeTruthy();
      expect(errorText()).toBeTruthy();
    });
  });

  describe('new password', () => {
    beforeEach(async () => {
      fillCredentials();
      logInSpy.mockResolvedValue({ needsSecondFactor: false, needsNewPassword: true });
      await submitCredentials();
      fixture.detectChanges();
    });

    it('should set the new password through Clerk on submit', () => {
      fillNewPassword();

      submitForm();

      expect(completeNewPasswordSpy).toHaveBeenCalledWith(newPassword);
    });

    it('should not submit an invalid new password', async () => {
      await setNewPassword();

      expect(completeNewPasswordSpy).not.toHaveBeenCalled();
      expect(postSpy).not.toHaveBeenCalled();
    });

    it('should complete the log in once Clerk accepts the new password', async () => {
      fillNewPassword();

      await setNewPassword();

      expect(authDrawer.open()).toBe(false);
      expect(toastSpy).toHaveBeenCalled();
    });

    it('should replace a temporary password through the API', async () => {
      fillNewPassword();
      userRecord.set({ hasTemporaryPassword: true });

      await setNewPassword();

      expect(postSpy).toHaveBeenCalledWith('/users/me/password', {
        currentPassword: 'Temp-pass1!',
        newPassword,
      });
      expect(loadSpy).toHaveBeenCalled();
      expect(completeNewPasswordSpy).not.toHaveBeenCalled();
      expect(authDrawer.open()).toBe(false);
    });

    it('should show the API error message', async () => {
      fillNewPassword();
      userRecord.set({ hasTemporaryPassword: true });
      postSpy.mockRejectedValue(new ApiError('Password was used before.', 400));

      await setNewPassword();
      fixture.detectChanges();

      expect(errorText()).toBe('Password was used before.');
      expect(authDrawer.open()).toBe(true);
    });

    it('should show the Clerk error message', async () => {
      fillNewPassword();
      completeNewPasswordSpy.mockRejectedValue(new Error('rejected'));

      await setNewPassword();
      fixture.detectChanges();

      expect(errorText()).toBe('Incorrect email or password');
    });
  });

  describe('destroy', () => {
    it('should clear the password', () => {
      fillCredentials();

      fixture.destroy();

      expect(authDrawer.loginForm.controls.password.value).toBe('');
      expect(authDrawer.loginForm.controls.email.value).toBe('ann@example.com');
      expect(logOutSpy).not.toHaveBeenCalled();
    });

    it('should end the session of a log in left partway through', () => {
      authDrawer.isCompletingLogin.set(true);
      isLoggedIn.set(true);

      fixture.destroy();

      expect(authDrawer.isCompletingLogin()).toBe(false);
      expect(logOutSpy).toHaveBeenCalled();
    });

    it('should not log out when the partway log in has no session yet', () => {
      authDrawer.isCompletingLogin.set(true);

      fixture.destroy();

      expect(authDrawer.isCompletingLogin()).toBe(false);
      expect(logOutSpy).not.toHaveBeenCalled();
    });
  });
});
