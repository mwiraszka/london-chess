import { Clerk } from '@clerk/clerk-js';
import { ToastService } from '@eagami/ui';
import { MockStore, provideMockStore } from '@ngrx/store/testing';

import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';

import { AuthActions } from '@app/store/auth';

import { environment } from '@env';

import { ClerkService } from './clerk.service';

interface FakeEmailAddress {
  id: string;
  prepareVerification: Mock;
  attemptVerification: Mock;
  destroy: Mock;
}

interface FakeUser {
  id: string;
  firstName: string | null;
  lastName: string | null;
  primaryEmailAddress: { emailAddress: string } | null;
  primaryEmailAddressId: string | null;
  emailAddresses: FakeEmailAddress[];
  publicMetadata: Record<string, boolean>;
  reload: Mock;
  update: Mock;
  createEmailAddress: Mock;
  updatePassword: Mock;
}

interface FakeSession {
  id: string;
  status: 'active' | 'pending';
  currentTask?: { key: string };
  getToken: Mock;
}

interface FakeSignIn {
  create: Mock;
  attemptSecondFactor: Mock;
  attemptFirstFactor: Mock;
  resetPassword: Mock;
}

interface FakeClerk {
  load: Mock;
  signOut: Mock;
  addListener: Mock;
  setActive: Mock;
  client: { signIn: FakeSignIn };
  session: FakeSession | null;
  user: FakeUser | null;
}

const clerkHolder = vi.hoisted(() => {
  const holder: { current?: FakeClerk } = {};
  return holder;
});

vi.mock('@clerk/clerk-js', () => ({
  Clerk: vi.fn(function () {
    return clerkHolder.current;
  }),
}));

describe('ClerkService', () => {
  let service: ClerkService;
  let fake: FakeClerk;

  let dispatchSpy: MockInstance;
  let navigateByUrlSpy: Mock;
  let toastSpy: Mock;

  const createEmail = (id: string): FakeEmailAddress => ({
    id,
    prepareVerification: vi.fn().mockResolvedValue(undefined),
    attemptVerification: vi.fn().mockResolvedValue(undefined),
    destroy: vi.fn().mockResolvedValue(undefined),
  });

  const createUser = (overrides: Partial<FakeUser> = {}): FakeUser => ({
    id: 'user_1',
    firstName: 'Ann',
    lastName: 'Lee',
    primaryEmailAddress: { emailAddress: 'ann@example.com' },
    primaryEmailAddressId: 'email_1',
    emailAddresses: [createEmail('email_1')],
    publicMetadata: { isAdmin: true },
    reload: vi.fn().mockResolvedValue(undefined),
    update: vi.fn().mockResolvedValue(undefined),
    createEmailAddress: vi.fn(),
    updatePassword: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  });

  const createSession = (overrides: Partial<FakeSession> = {}): FakeSession => ({
    id: 'sess_1',
    status: 'active',
    getToken: vi.fn().mockResolvedValue('token-123'),
    ...overrides,
  });

  const notifyListeners = (): void => {
    for (const [listener] of fake.addListener.mock.calls) {
      listener();
    }
  };

  const clerkError = (code: string, longMessage?: string) => ({
    errors: [{ code, longMessage }],
  });

  beforeEach(async () => {
    fake = {
      load: vi.fn().mockResolvedValue(undefined),
      signOut: vi.fn().mockResolvedValue(undefined),
      addListener: vi.fn(),
      setActive: vi.fn().mockResolvedValue(undefined),
      client: {
        signIn: {
          create: vi.fn(),
          attemptSecondFactor: vi.fn(),
          attemptFirstFactor: vi.fn(),
          resetPassword: vi.fn(),
        },
      },
      session: createSession(),
      user: createUser(),
    };
    clerkHolder.current = fake;
    navigateByUrlSpy = vi.fn().mockResolvedValue(true);
    toastSpy = vi.fn();

    TestBed.configureTestingModule({
      providers: [
        provideMockStore(),
        { provide: Router, useValue: { navigateByUrl: navigateByUrlSpy } },
        { provide: ToastService, useValue: { show: toastSpy } },
      ],
    });

    service = TestBed.inject(ClerkService);
    dispatchSpy = vi.spyOn(TestBed.inject(MockStore), 'dispatch');

    await service.load();
  });

  describe('load', () => {
    it('should load Clerk and sync the logged in user to the store', () => {
      expect(Clerk).toHaveBeenCalledWith(environment.clerkPublishableKey);
      expect(service.client).toBe(fake);
      expect(service.isLoaded()).toBe(true);
      expect(service.isLoggedIn()).toBe(true);
      expect(service.user()).toBe(fake.user);
      expect(dispatchSpy).toHaveBeenCalledWith(
        AuthActions.userChanged({
          user: {
            id: 'user_1',
            firstName: 'Ann',
            lastName: 'Lee',
            email: 'ann@example.com',
            isAdmin: true,
          },
        }),
      );
    });

    it('should route Clerk navigation through the Angular router', () => {
      const { routerPush, routerReplace } = fake.load.mock.calls[0][0];

      routerPush('/account');
      routerReplace('/');

      expect(navigateByUrlSpy).toHaveBeenCalledWith('/account');
      expect(navigateByUrlSpy).toHaveBeenCalledWith('/', { replaceUrl: true });
    });

    it('should map missing user details to empty values and a non-admin', async () => {
      fake.user = createUser({
        firstName: null,
        lastName: null,
        primaryEmailAddress: null,
        publicMetadata: {},
      });

      await service.load();

      expect(dispatchSpy).toHaveBeenLastCalledWith(
        AuthActions.userChanged({
          user: { id: 'user_1', firstName: '', lastName: '', email: '', isAdmin: false },
        }),
      );
    });

    it('should sign out a session left pending on a new password', async () => {
      fake.session = createSession({ status: 'pending' });

      await service.load();

      expect(fake.signOut).toHaveBeenCalled();
      expect(service.isLoggedIn()).toBe(false);
      expect(service.user()).toBeNull();
      expect(dispatchSpy).toHaveBeenLastCalledWith(
        AuthActions.userChanged({ user: null }),
      );
    });
  });

  describe('session changes', () => {
    it('should tell the member when a session ends that this device did not end', () => {
      fake.user = null;

      notifyListeners();

      expect(service.isLoggedIn()).toBe(false);
      expect(toastSpy).toHaveBeenCalledWith(
        'You have been logged out on this device.',
        expect.objectContaining({ variant: 'info' }),
      );
    });

    it('should not show a logged out notice after logging out on this device', async () => {
      await service.logOut();
      fake.user = null;

      notifyListeners();

      expect(fake.signOut).toHaveBeenCalled();
      expect(toastSpy).not.toHaveBeenCalled();
    });

    it('should not show a logged out notice when the session end was expected', () => {
      service.expectSessionEnd();
      fake.user = null;

      notifyListeners();

      expect(toastSpy).not.toHaveBeenCalled();
    });

    it('should show the notice for a later unexpected session end', () => {
      service.expectSessionEnd();
      fake.user = null;
      notifyListeners();
      fake.user = createUser();
      notifyListeners();

      fake.user = null;
      notifyListeners();

      expect(toastSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('logIn', () => {
    it('should send an email code when a second factor is needed', async () => {
      const prepareSecondFactor = vi.fn().mockResolvedValue(undefined);
      fake.client.signIn.create.mockResolvedValue({
        status: 'needs_second_factor',
        prepareSecondFactor,
      });

      const result = await service.logIn('ann@example.com', 'secret');

      expect(fake.client.signIn.create).toHaveBeenCalledWith({
        strategy: 'password',
        identifier: 'ann@example.com',
        password: 'secret',
      });
      expect(prepareSecondFactor).toHaveBeenCalledWith({ strategy: 'email_code' });
      expect(result).toEqual({ needsSecondFactor: true, needsNewPassword: false });
    });

    it('should ask for a new password when Clerk requires one', async () => {
      fake.client.signIn.create.mockResolvedValue({ status: 'needs_new_password' });

      const result = await service.logIn('ann@example.com', 'secret');

      expect(result).toEqual({ needsSecondFactor: false, needsNewPassword: true });
      expect(fake.setActive).not.toHaveBeenCalled();
    });

    it('should activate the session without letting Clerk navigate', async () => {
      fake.client.signIn.create.mockResolvedValue({
        status: 'complete',
        createdSessionId: 'sess_2',
      });

      const result = await service.logIn('ann@example.com', 'secret');

      const { session, navigate } = fake.setActive.mock.calls[0][0];
      expect(session).toBe('sess_2');
      await expect(navigate()).resolves.toBeUndefined();
      expect(navigateByUrlSpy).not.toHaveBeenCalled();
      expect(result).toEqual({ needsSecondFactor: false, needsNewPassword: false });
    });

    it('should report a pending reset password task as needing a new password', async () => {
      fake.client.signIn.create.mockResolvedValue({
        status: 'complete',
        createdSessionId: 'sess_2',
      });
      fake.session = createSession({ currentTask: { key: 'reset-password' } });

      const result = await service.logIn('ann@example.com', 'secret');

      expect(result).toEqual({ needsSecondFactor: false, needsNewPassword: true });
    });

    it('should not activate a session for an incomplete sign in', async () => {
      fake.client.signIn.create.mockResolvedValue({ status: 'needs_identifier' });

      await service.logIn('ann@example.com', 'secret');

      expect(fake.setActive).not.toHaveBeenCalled();
    });
  });

  describe('verifyLoginCode', () => {
    it('should activate the session once the code is accepted', async () => {
      fake.client.signIn.attemptSecondFactor.mockResolvedValue({
        status: 'complete',
        createdSessionId: 'sess_2',
      });

      const result = await service.verifyLoginCode('123456');

      expect(fake.client.signIn.attemptSecondFactor).toHaveBeenCalledWith({
        strategy: 'email_code',
        code: '123456',
      });
      expect(fake.setActive).toHaveBeenCalledWith(
        expect.objectContaining({ session: 'sess_2' }),
      );
      expect(result).toEqual({ needsNewPassword: false });
    });

    it('should not activate a session while the sign in is incomplete', async () => {
      fake.client.signIn.attemptSecondFactor.mockResolvedValue({
        status: 'needs_second_factor',
      });

      await service.verifyLoginCode('123456');

      expect(fake.setActive).not.toHaveBeenCalled();
    });
  });

  describe('completeNewPassword', () => {
    it('should resolve a pending reset password task by updating the password', async () => {
      fake.session = createSession({
        id: 'sess_3',
        currentTask: { key: 'reset-password' },
      });

      await service.completeNewPassword('N3w-password!');

      expect(fake.user?.updatePassword).toHaveBeenCalledWith({
        newPassword: 'N3w-password!',
        signOutOfOtherSessions: true,
      });
      expect(fake.setActive).toHaveBeenCalledWith(
        expect.objectContaining({ session: 'sess_3' }),
      );
      expect(fake.client.signIn.resetPassword).not.toHaveBeenCalled();
    });

    it('should reset the password on the sign in and activate the session', async () => {
      fake.client.signIn.resetPassword.mockResolvedValue({
        status: 'complete',
        createdSessionId: 'sess_2',
      });

      await service.completeNewPassword('N3w-password!');

      expect(fake.client.signIn.resetPassword).toHaveBeenCalledWith({
        password: 'N3w-password!',
        signOutOfOtherSessions: true,
      });
      expect(fake.setActive).toHaveBeenCalledWith(
        expect.objectContaining({ session: 'sess_2' }),
      );
    });

    it('should not activate a session when the reset is incomplete', async () => {
      fake.client.signIn.resetPassword.mockResolvedValue({
        status: 'needs_new_password',
      });

      await service.completeNewPassword('N3w-password!');

      expect(fake.setActive).not.toHaveBeenCalled();
    });
  });

  describe('sendPasswordResetCode', () => {
    it('should request a reset code for the email', async () => {
      fake.client.signIn.create.mockResolvedValue({});

      await service.sendPasswordResetCode('ann@example.com');

      expect(fake.client.signIn.create).toHaveBeenCalledWith({
        strategy: 'reset_password_email_code',
        identifier: 'ann@example.com',
      });
    });

    it.each(['form_identifier_not_found', 'strategy_for_user_invalid'])(
      'should resolve as if sent when Clerk responds with %s',
      async code => {
        fake.client.signIn.create.mockRejectedValue(clerkError(code));

        await expect(service.sendPasswordResetCode('nobody@example.com')).resolves.toBe(
          undefined,
        );
      },
    );

    it('should rethrow any other Clerk error', async () => {
      const error = clerkError('too_many_requests');
      fake.client.signIn.create.mockRejectedValue(error);

      await expect(service.sendPasswordResetCode('ann@example.com')).rejects.toBe(error);
    });

    it('should rethrow an error that is not from Clerk', async () => {
      const error = new Error('Network down');
      fake.client.signIn.create.mockRejectedValue(error);

      await expect(service.sendPasswordResetCode('ann@example.com')).rejects.toBe(error);
    });
  });

  describe('resetPassword', () => {
    it('should set the new password after the code and resolve logged in', async () => {
      fake.client.signIn.attemptFirstFactor.mockResolvedValue({
        status: 'needs_new_password',
      });
      fake.client.signIn.resetPassword.mockResolvedValue({
        status: 'complete',
        createdSessionId: 'sess_2',
      });

      const result = await service.resetPassword('123456', 'N3w-password!');

      expect(fake.client.signIn.attemptFirstFactor).toHaveBeenCalledWith({
        strategy: 'reset_password_email_code',
        code: '123456',
      });
      expect(fake.client.signIn.resetPassword).toHaveBeenCalledWith({
        password: 'N3w-password!',
        signOutOfOtherSessions: true,
      });
      expect(fake.setActive).toHaveBeenCalledWith(
        expect.objectContaining({ session: 'sess_2' }),
      );
      expect(result).toBe(true);
    });

    it('should resolve logged out when the reset does not complete', async () => {
      fake.client.signIn.attemptFirstFactor.mockResolvedValue({
        status: 'needs_first_factor',
      });

      const result = await service.resetPassword('123456', 'N3w-password!');

      expect(fake.setActive).not.toHaveBeenCalled();
      expect(result).toBe(false);
    });

    it('should resolve a temporary password task with the same new password', async () => {
      fake.client.signIn.attemptFirstFactor.mockResolvedValue({
        status: 'complete',
        createdSessionId: 'sess_2',
      });
      fake.session = createSession({
        status: 'pending',
        currentTask: { key: 'reset-password' },
      });
      fake.user?.updatePassword.mockImplementation(async () => {
        fake.session = createSession();
      });

      const result = await service.resetPassword('123456', 'N3w-password!');

      expect(fake.client.signIn.resetPassword).not.toHaveBeenCalled();
      expect(fake.user?.updatePassword).toHaveBeenCalledWith({
        newPassword: 'N3w-password!',
        signOutOfOtherSessions: true,
      });
      expect(result).toBe(true);
    });

    it('should resolve logged out when no session was activated', async () => {
      fake.client.signIn.attemptFirstFactor.mockResolvedValue({
        status: 'complete',
        createdSessionId: null,
      });
      fake.session = null;

      const result = await service.resetPassword('123456', 'N3w-password!');

      expect(result).toBe(false);
    });
  });

  describe('user', () => {
    it('should reload the user and publish the fresh copy', async () => {
      await service.reloadUser();

      expect(fake.user?.reload).toHaveBeenCalled();
      expect(service.user()).toBe(fake.user);
    });

    it('should tolerate reloading with no user', async () => {
      fake.user = null;

      await service.reloadUser();

      expect(service.user()).toBeNull();
    });

    it('should update the name', async () => {
      await service.updateProfile('Anna', 'Leigh');

      expect(fake.user?.update).toHaveBeenCalledWith({
        firstName: 'Anna',
        lastName: 'Leigh',
      });
    });
  });

  describe('getToken', () => {
    it('should return the session token', async () => {
      await expect(service.getToken()).resolves.toBe('token-123');
    });

    it('should return null without a session', async () => {
      fake.session = null;

      await expect(service.getToken()).resolves.toBeNull();
    });
  });

  describe('email changes', () => {
    it('should add the email and send it a verification code', async () => {
      const email = createEmail('email_2');
      fake.user?.createEmailAddress.mockResolvedValue(email);

      const id = await service.createEmail('new@example.com');

      expect(fake.user?.createEmailAddress).toHaveBeenCalledWith({
        email: 'new@example.com',
      });
      expect(email.prepareVerification).toHaveBeenCalledWith({ strategy: 'email_code' });
      expect(id).toBe('email_2');
    });

    it('should verify the new email, make it primary and remove the previous one', async () => {
      const previous = createEmail('email_1');
      const next = createEmail('email_2');
      fake.user = createUser({ emailAddresses: [previous, next] });

      await service.verifyAndSetPrimaryEmail('email_2', '123456');

      expect(next.attemptVerification).toHaveBeenCalledWith({ code: '123456' });
      expect(fake.user.update).toHaveBeenCalledWith({ primaryEmailAddressId: 'email_2' });
      expect(previous.destroy).toHaveBeenCalled();
      expect(next.destroy).not.toHaveBeenCalled();
    });

    it('should keep the email when it was already primary', async () => {
      const email = createEmail('email_1');
      fake.user = createUser({ emailAddresses: [email] });

      await service.verifyAndSetPrimaryEmail('email_1', '123456');

      expect(email.destroy).not.toHaveBeenCalled();
    });

    it('should not remove anything when there was no primary email', async () => {
      const email = createEmail('email_2');
      fake.user = createUser({ primaryEmailAddressId: null, emailAddresses: [email] });

      await service.verifyAndSetPrimaryEmail('email_2', '123456');

      expect(fake.user.update).toHaveBeenCalled();
      expect(email.destroy).not.toHaveBeenCalled();
    });

    it('should reject an unknown email id', async () => {
      await expect(
        service.verifyAndSetPrimaryEmail('email_9', '123456'),
      ).rejects.toThrow();

      expect(fake.user?.update).not.toHaveBeenCalled();
    });
  });

  describe('extractError', () => {
    it('should give the same message for an unknown email and a wrong password', () => {
      const unknownEmail = service.extractError(clerkError('form_identifier_not_found'));
      const wrongPassword = service.extractError(clerkError('form_password_incorrect'));

      expect(unknownEmail).toBe(wrongPassword);
    });

    it('should fall back to the Clerk message without its trailing period', () => {
      const message = service.extractError(clerkError('other_code', 'Try again later.'));

      expect(message).toBe('Try again later');
    });

    it('should return a generic message for an error that is not from Clerk', () => {
      const generic = service.extractError(new Error('boom'));

      expect(generic).toBeTruthy();
      expect(service.extractError({ errors: 'not a list' })).toBe(generic);
      expect(service.extractError(null)).toBe(generic);
    });
  });
});
