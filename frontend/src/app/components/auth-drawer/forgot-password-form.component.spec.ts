import { ToastService } from '@eagami/ui';

import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';

import { ApiError, ApiService } from '@app/services/api.service';
import { AuthDrawerService } from '@app/services/auth-drawer.service';
import { ClerkService } from '@app/services/clerk.service';
import { UserService } from '@app/services/user.service';
import { query, queryTextContent } from '@app/utils';

import { ForgotPasswordFormComponent } from './forgot-password-form.component';

describe('ForgotPasswordFormComponent', () => {
  let fixture: ComponentFixture<ForgotPasswordFormComponent>;
  let component: ForgotPasswordFormComponent;
  let authDrawer: AuthDrawerService;

  let sendPasswordResetCodeSpy: Mock<Promise<void>>;
  let resetPasswordSpy: Mock<Promise<boolean>>;
  let postSpy: Mock;
  let loadSpy: Mock<Promise<void>>;
  let setUserSpy: Mock;
  let navigateByUrlSpy: Mock;
  let toastSpy: Mock;

  const userRecord = signal<{ hasTemporaryPassword: boolean } | null>(null);

  const newPassword = 'Str0ng-password!';

  const sendCode = (): Promise<void> => {
    // @ts-expect-error Protected class member
    return component.onSendCode();
  };

  const resetPassword = (): Promise<void> => {
    // @ts-expect-error Protected class member
    return component.onResetPassword();
  };

  const fillResetForm = (): void => {
    // @ts-expect-error Protected class member
    component.resetForm.setValue({
      code: '123456',
      passwords: { newPassword, confirmPassword: newPassword },
    });
  };

  const emailInput = (): HTMLInputElement =>
    query(fixture.debugElement, 'ea-input input').nativeElement;

  const submitForm = (): void => {
    query(fixture.debugElement, 'form').nativeElement.dispatchEvent(new Event('submit'));
  };

  const errorText = (): string => queryTextContent(fixture.debugElement, '.error');

  beforeEach(async () => {
    userRecord.set(null);
    sendPasswordResetCodeSpy = vi.fn().mockResolvedValue(undefined);
    resetPasswordSpy = vi.fn().mockResolvedValue(true);
    postSpy = vi.fn();
    loadSpy = vi.fn().mockResolvedValue(undefined);
    setUserSpy = vi.fn();
    navigateByUrlSpy = vi.fn().mockResolvedValue(true);
    toastSpy = vi.fn();

    await TestBed.configureTestingModule({
      imports: [ForgotPasswordFormComponent],
      providers: [
        { provide: ApiService, useValue: { post: postSpy } },
        {
          provide: ClerkService,
          useValue: {
            sendPasswordResetCode: sendPasswordResetCodeSpy,
            resetPassword: resetPasswordSpy,
            extractError: () => 'Incorrect verification code',
          },
        },
        { provide: Router, useValue: { navigateByUrl: navigateByUrlSpy } },
        { provide: ToastService, useValue: { show: toastSpy } },
        {
          provide: UserService,
          useValue: { load: loadSpy, user: userRecord, setUser: setUserSpy },
        },
      ],
    }).compileComponents();

    authDrawer = TestBed.inject(AuthDrawerService);
    authDrawer.loginForm.controls.email.setValue('ann@example.com');
    authDrawer.open.set(true);
    authDrawer.setMode('forgot-password');
    fixture = TestBed.createComponent(ForgotPasswordFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('email step', () => {
    it('should start from the email typed into the log in form', () => {
      expect(emailInput().value).toBe('ann@example.com');
    });

    it('should carry a changed email back to the log in form', () => {
      emailInput().value = 'anna@example.com';

      emailInput().dispatchEvent(new Event('input'));

      expect(authDrawer.loginForm.controls.email.value).toBe('anna@example.com');
    });

    it('should send a reset code on submit', () => {
      submitForm();

      expect(sendPasswordResetCodeSpy).toHaveBeenCalledWith('ann@example.com');
    });

    it('should not send a code to an invalid email', async () => {
      emailInput().value = 'not-an-email';
      emailInput().dispatchEvent(new Event('input'));

      await sendCode();

      expect(sendPasswordResetCodeSpy).not.toHaveBeenCalled();
    });

    it('should move on to the reset step once the code is sent', async () => {
      await sendCode();
      fixture.detectChanges();

      expect(query(fixture.debugElement, 'ea-code-input')).toBeTruthy();
      expect(query(fixture.debugElement, 'lcc-new-password-fields')).toBeTruthy();
    });

    it('should show the error when the code cannot be sent', async () => {
      sendPasswordResetCodeSpy.mockRejectedValue(new Error('rejected'));

      await sendCode();
      fixture.detectChanges();

      expect(query(fixture.debugElement, 'ea-code-input')).toBeFalsy();
      expect(errorText()).toBe('Incorrect verification code');
    });

    it('should go back to the log in form', () => {
      query(fixture.debugElement, '.auth-link__button').nativeElement.click();

      expect(authDrawer.mode()).toBe('login');
    });
  });

  describe('reset step', () => {
    beforeEach(async () => {
      await sendCode();
      fixture.detectChanges();
    });

    it('should reset the password with the code on submit', () => {
      fillResetForm();

      submitForm();

      expect(resetPasswordSpy).toHaveBeenCalledWith('123456', newPassword);
    });

    it('should not submit an incomplete reset form', async () => {
      await resetPassword();

      expect(resetPasswordSpy).not.toHaveBeenCalled();
    });

    it('should log the member in, close the drawer and go home', async () => {
      fillResetForm();

      await resetPassword();

      expect(loadSpy).toHaveBeenCalled();
      expect(postSpy).not.toHaveBeenCalled();
      expect(authDrawer.open()).toBe(false);
      expect(authDrawer.isCompletingLogin()).toBe(false);
      expect(authDrawer.loginForm.controls.email.value).toBe('');
      expect(navigateByUrlSpy).toHaveBeenCalledWith('/');
      expect(toastSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ variant: 'success' }),
      );
    });

    it('should confirm the new password replaces a temporary one', async () => {
      fillResetForm();
      userRecord.set({ hasTemporaryPassword: true });
      const confirmed = { hasTemporaryPassword: false };
      postSpy.mockResolvedValue(confirmed);

      await resetPassword();

      expect(postSpy).toHaveBeenCalledWith('/users/me/password/confirm', {
        password: newPassword,
      });
      expect(setUserSpy).toHaveBeenCalledWith(confirmed);
      expect(authDrawer.open()).toBe(false);
    });

    it('should return to the log in form when the reset does not log the member in', async () => {
      fillResetForm();
      resetPasswordSpy.mockResolvedValue(false);

      await resetPassword();

      expect(authDrawer.mode()).toBe('login');
      expect(authDrawer.open()).toBe(true);
      expect(authDrawer.isCompletingLogin()).toBe(false);
      expect(loadSpy).not.toHaveBeenCalled();
    });

    it('should show the API error message', async () => {
      fillResetForm();
      userRecord.set({ hasTemporaryPassword: true });
      postSpy.mockRejectedValue(new ApiError('Password was used before.', 400));

      await resetPassword();
      fixture.detectChanges();

      expect(errorText()).toBe('Password was used before.');
      expect(authDrawer.isCompletingLogin()).toBe(false);
    });

    it('should show the Clerk error message', async () => {
      fillResetForm();
      resetPasswordSpy.mockRejectedValue(new Error('rejected'));

      await resetPassword();
      fixture.detectChanges();

      expect(errorText()).toBe('Incorrect verification code');
      expect(authDrawer.open()).toBe(true);
    });
  });
});
