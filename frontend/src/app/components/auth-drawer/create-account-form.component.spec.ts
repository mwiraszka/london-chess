import { CodeInputComponent, ToastService } from '@eagami/ui';

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ApiError, ApiService, AuthDrawerService } from '@app/services';
import { query, queryAll, queryTextContent } from '@app/utils';

import { CreateAccountFormComponent } from './create-account-form.component';

describe('CreateAccountFormComponent', () => {
  let fixture: ComponentFixture<CreateAccountFormComponent>;
  let component: CreateAccountFormComponent;
  let authDrawer: AuthDrawerService;

  let postSpy: Mock<Promise<void>>;
  let toastSpy: Mock;

  const submit = (): Promise<void> => {
    // @ts-expect-error Protected class member
    return component.onSubmit();
  };

  const verifyAndSubmit = (): Promise<void> => {
    // @ts-expect-error Protected class member
    return component.onVerifyAndSubmit();
  };

  const resendCode = (): Promise<void> => {
    // @ts-expect-error Protected class member
    return component.onResendCode();
  };

  const enterCode = (code: string): void => {
    // @ts-expect-error Protected class member
    component.verificationForm.controls.code.setValue(code);
  };

  const fillForm = (): void => {
    authDrawer.createAccountForm.setValue({
      firstName: ' Ann ',
      lastName: ' Lee ',
      email: 'ann@example.com',
      yearOfBirth: 1990,
      city: ' London ',
      phoneNumber: ' 416-555-0100 ',
      lichessUsername: 'ann_lichess',
      chessComUsername: 'ann_chesscom',
    });
  };

  const showCodeStep = async (): Promise<void> => {
    fillForm();
    await submit();
    fixture.detectChanges();
  };

  const submitForm = (): void => {
    query(fixture.debugElement, 'form').nativeElement.dispatchEvent(new Event('submit'));
  };

  const codeInput = (): CodeInputComponent =>
    query(fixture.debugElement, 'ea-code-input').componentInstance;

  const errorText = (): string => queryTextContent(fixture.debugElement, '.error');

  beforeEach(async () => {
    postSpy = vi.fn().mockResolvedValue(undefined);
    toastSpy = vi.fn();

    await TestBed.configureTestingModule({
      imports: [CreateAccountFormComponent],
      providers: [
        { provide: ApiService, useValue: { post: postSpy } },
        { provide: ToastService, useValue: { show: toastSpy } },
      ],
    }).compileComponents();

    authDrawer = TestBed.inject(AuthDrawerService);
    authDrawer.open.set(true);
    authDrawer.setMode('create-account');
    fixture = TestBed.createComponent(CreateAccountFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('details step', () => {
    it('should send a verification code to the trimmed email on submit', () => {
      fillForm();

      submitForm();

      expect(postSpy).toHaveBeenCalledWith('/users/account-requests/verification', {
        email: 'ann@example.com',
      });
    });

    it('should not send a code for an incomplete form', async () => {
      authDrawer.createAccountForm.controls.email.setValue('ann@example.com');

      await submit();

      expect(postSpy).not.toHaveBeenCalled();
    });

    it('should move on to the code step and focus the code input', async () => {
      const focusSpy = vi.spyOn(CodeInputComponent.prototype, 'focus');
      fillForm();

      await submit();
      fixture.detectChanges();
      await fixture.whenStable();

      expect(query(fixture.debugElement, 'lcc-member-account-fields')).toBeFalsy();
      expect(codeInput()).toBeTruthy();
      expect(focusSpy).toHaveBeenCalled();
    });

    it('should let a visitor use a code that was already sent', async () => {
      fillForm();
      postSpy.mockRejectedValue(new ApiError('A code was sent recently.', 429));

      await submit();
      fixture.detectChanges();

      expect(codeInput()).toBeTruthy();
      expect(toastSpy).toHaveBeenCalledWith(
        'A code was sent recently.',
        expect.objectContaining({ variant: 'info' }),
      );
    });

    it('should show an API error without its trailing period', async () => {
      fillForm();
      postSpy.mockRejectedValue(new ApiError('Email already has an account.', 409));

      await submit();
      fixture.detectChanges();

      expect(query(fixture.debugElement, 'lcc-member-account-fields')).toBeTruthy();
      expect(errorText()).toBe('Email already has an account');
    });

    it('should show a generic error for an unexpected failure', async () => {
      fillForm();
      postSpy.mockRejectedValue(new Error('offline'));

      await submit();
      fixture.detectChanges();

      expect(errorText()).toBeTruthy();
    });

    it('should switch to the log in form', () => {
      query(fixture.debugElement, '.auth-link__button').nativeElement.click();

      expect(authDrawer.mode()).toBe('login');
    });
  });

  describe('code step', () => {
    beforeEach(async () => {
      await showCodeStep();
      postSpy.mockClear();
    });

    it('should submit the trimmed request with the code on submit', () => {
      enterCode('123456');
      fixture.detectChanges();

      submitForm();

      expect(postSpy).toHaveBeenCalledWith('/users/account-requests', {
        firstName: 'Ann',
        lastName: 'Lee',
        email: 'ann@example.com',
        yearOfBirth: 1990,
        city: 'London',
        phoneNumber: '416-555-0100',
        lichessUsername: 'ann_lichess',
        chessComUsername: 'ann_chesscom',
        verificationCode: '123456',
      });
    });

    it('should not submit an incomplete code', async () => {
      enterCode('123');

      await verifyAndSubmit();

      expect(postSpy).not.toHaveBeenCalled();
    });

    it('should clear the forms, close the drawer and confirm the request', async () => {
      enterCode('123456');

      await verifyAndSubmit();

      expect(authDrawer.open()).toBe(false);
      expect(authDrawer.createAccountForm.controls.firstName.value).toBe('');
      expect(toastSpy).toHaveBeenCalledWith(
        expect.stringContaining('ann@example.com'),
        expect.objectContaining({ variant: 'success', duration: 0 }),
      );
    });

    it('should show a rejected code on the code input', async () => {
      enterCode('000000');
      postSpy.mockRejectedValue(new ApiError('Incorrect code.', 400));

      await verifyAndSubmit();
      fixture.detectChanges();

      expect(codeInput().errorMsg()).toBe('Incorrect code');
      expect(authDrawer.open()).toBe(true);
    });

    it('should send a new code from the resend button', () => {
      const [resend] = queryAll(fixture.debugElement, '.code-actions button');

      resend.nativeElement.click();

      expect(postSpy).toHaveBeenCalledWith('/users/account-requests/verification', {
        email: 'ann@example.com',
      });
    });

    it('should show an error when a new code cannot be sent', async () => {
      postSpy.mockRejectedValue(new Error('offline'));

      await resendCode();
      fixture.detectChanges();

      expect(codeInput()).toBeTruthy();
      expect(errorText()).toBeTruthy();
    });

    it('should go back to the details with the code and errors cleared', async () => {
      enterCode('000000');
      postSpy.mockRejectedValue(new ApiError('Incorrect code.', 400));
      await verifyAndSubmit();
      const [, back] = queryAll(fixture.debugElement, '.code-actions button');

      back.nativeElement.click();
      fixture.detectChanges();

      expect(query(fixture.debugElement, 'lcc-member-account-fields')).toBeTruthy();
      expect(query(fixture.debugElement, '.error')).toBeFalsy();
      expect(authDrawer.createAccountForm.controls.firstName.value).toBe(' Ann ');
      // @ts-expect-error Protected class member
      expect(component.verificationForm.controls.code.value).toBe('');
    });
  });
});
