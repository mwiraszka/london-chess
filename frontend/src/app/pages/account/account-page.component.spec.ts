import { ToastService } from '@eagami/ui';
import { BehaviorSubject } from 'rxjs';

import { WritableSignal, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  ActivatedRoute,
  ParamMap,
  Router,
  convertToParamMap,
  provideRouter,
} from '@angular/router';

import { Member, UserRecord, UserSessionRecord } from '@app/models';
import {
  ApiError,
  ApiService,
  ClerkService,
  MemberProfilesService,
  MetaAndTitleService,
  UserService,
} from '@app/services';
import { queryAll } from '@app/utils';

import { AccountPageComponent } from './account-page.component';

interface ClerkUserStub {
  firstName: string;
  lastName: string;
  hasImage: boolean;
  imageUrl: string;
  passwordEnabled: boolean;
  primaryEmailAddress: { emailAddress: string };
}

describe('AccountPageComponent', () => {
  let fixture: ComponentFixture<AccountPageComponent>;
  let component: AccountPageComponent;
  let paramMap: BehaviorSubject<ParamMap>;
  let clerkUser: WritableSignal<ClerkUserStub>;
  let api: { get: Mock; post: Mock; patch: Mock; delete: Mock };
  let clerk: {
    user: WritableSignal<ClerkUserStub>;
    reloadUser: Mock;
    createEmail: Mock;
    verifyAndSetPrimaryEmail: Mock;
    extractError: Mock;
    expectSessionEnd: Mock;
    logOut: Mock;
  };
  let userService: {
    user: WritableSignal<UserRecord | null>;
    hasAvatar: WritableSignal<boolean>;
    avatarCropState: WritableSignal<null>;
    avatarUrl: WritableSignal<string | undefined>;
    load: Mock;
    setUser: Mock;
    clearAvatar: Mock;
  };
  let toast: { show: Mock };
  let memberProfiles: { reload: Mock };

  const member: Pick<
    Member,
    'yearOfBirth' | 'city' | 'phoneNumber' | 'lichessUsername' | 'chessComUsername'
  > = {
    yearOfBirth: '1990',
    city: 'London',
    phoneNumber: '519-555-0123',
    lichessUsername: 'janesmith',
    chessComUsername: '',
  };

  const record: UserRecord = {
    id: 'user_jane',
    memberNumber: 7,
    firstName: 'Jane',
    lastName: 'Smith',
    email: 'jane@example.com',
    isAdmin: false,
    clerkImageUrl: null,
    avatarUrl: null,
    avatarOriginalUrl: null,
    avatarCropState: null,
    avatarUpdatedAt: null,
    hasTemporaryPassword: false,
    showYearOfBirth: false,
  };

  const sessions: UserSessionRecord[] = [
    {
      id: 'sess_old',
      isCurrent: false,
      isMobile: true,
      browserName: 'Safari',
      deviceType: null,
      lastActiveAt: 1_000,
    },
    {
      id: 'sess_now',
      isCurrent: true,
      isMobile: false,
      browserName: 'Chrome',
      deviceType: 'Laptop',
      lastActiveAt: 2_000,
    },
    {
      id: 'sess_recent',
      isCurrent: false,
      isMobile: false,
      browserName: null,
      deviceType: null,
      lastActiveAt: 3_000,
    },
  ];

  // Lets the page's awaited loads settle and shows what they changed
  async function settle(): Promise<void> {
    await fixture.whenStable();
    fixture.detectChanges();
  }

  async function render(section = 'profile'): Promise<void> {
    paramMap.next(convertToParamMap({ section }));
    fixture = TestBed.createComponent(AccountPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await settle();
  }

  beforeEach(async () => {
    paramMap = new BehaviorSubject(convertToParamMap({ section: 'profile' }));
    clerkUser = signal({
      firstName: 'Jane',
      lastName: 'Smith',
      hasImage: false,
      imageUrl: '',
      passwordEnabled: true,
      primaryEmailAddress: { emailAddress: 'jane@example.com' },
    });
    api = {
      get: vi.fn(async (path: string) =>
        path === '/users/me/sessions' ? sessions : member,
      ),
      post: vi.fn().mockResolvedValue(undefined),
      patch: vi.fn().mockResolvedValue(record),
      delete: vi.fn().mockResolvedValue(undefined),
    };
    clerk = {
      user: clerkUser,
      reloadUser: vi.fn().mockResolvedValue(undefined),
      createEmail: vi.fn().mockResolvedValue('email_new'),
      verifyAndSetPrimaryEmail: vi.fn().mockResolvedValue(undefined),
      extractError: vi.fn((error: Error) => error.message),
      expectSessionEnd: vi.fn(),
      logOut: vi.fn().mockResolvedValue(undefined),
    };
    userService = {
      user: signal(record),
      hasAvatar: signal(false),
      avatarCropState: signal(null),
      avatarUrl: signal(undefined),
      load: vi.fn().mockResolvedValue(undefined),
      setUser: vi.fn(),
      clearAvatar: vi.fn(),
    };
    toast = { show: vi.fn() };
    memberProfiles = { reload: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [AccountPageComponent],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap,
            snapshot: {
              get paramMap() {
                return paramMap.value;
              },
            },
          },
        },
        { provide: ApiService, useValue: api },
        { provide: ClerkService, useValue: clerk },
        { provide: UserService, useValue: userService },
        { provide: ToastService, useValue: toast },
        { provide: MemberProfilesService, useValue: memberProfiles },
        {
          provide: MetaAndTitleService,
          useValue: { updateTitle: vi.fn(), updateDescription: vi.fn() },
        },
      ],
    }).compileComponents();
  });

  it('should fill in the account holder and their member details', async () => {
    await render();

    expect(component['detailsForm'].getRawValue()).toEqual({
      firstName: 'Jane',
      lastName: 'Smith',
      yearOfBirth: 1990,
      city: 'London',
      phoneNumber: '519-555-0123',
      lichessUsername: 'janesmith',
      chessComUsername: '',
    });
    expect(component['hasDetailChanges']()).toBe(false);
  });

  it('should send a section it does not know to the profile', async () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate');

    await render('billing');

    expect(navigate).toHaveBeenCalledWith(['/account/profile'], { replaceUrl: true });
  });

  describe('requesting changes to member details', () => {
    it('should send the details trimmed, with the phone number in its stored format', async () => {
      await render();
      component['detailsForm'].patchValue({
        city: '  Komoka ',
        phoneNumber: '(519) 555 0199',
      });

      await component['onRequestChanges']();

      expect(api.post).toHaveBeenCalledWith('/users/me/member/change-request', {
        firstName: 'Jane',
        lastName: 'Smith',
        yearOfBirth: '1990',
        city: 'Komoka',
        phoneNumber: '519-555-0199',
        lichessUsername: 'janesmith',
        chessComUsername: '',
      });
      expect(toast.show).toHaveBeenCalledWith(
        'An admin will email you once your changes are made.',
        { title: 'Request sent', variant: 'success' },
      );
    });

    it('should explain a request the server refuses', async () => {
      await render();
      api.post.mockRejectedValue(
        new ApiError('Something is wrong with the request', 400),
      );

      await component['onRequestChanges']();

      expect(toast.show).toHaveBeenCalledWith('Something is wrong with the request.', {
        title: 'Request failed',
        variant: 'error',
      });
    });
  });

  it('should save whether the year of birth shows on the profile', async () => {
    await render();
    const updated = { ...record, showYearOfBirth: true };
    api.patch.mockResolvedValue(updated);

    await component['onToggleYearOfBirth'](true);

    expect(api.patch).toHaveBeenCalledWith('/users/me', { showYearOfBirth: true });
    expect(userService.setUser).toHaveBeenCalledWith(updated);
  });

  describe('changing the email address', () => {
    it('should send a code to the new address, then make it primary once verified', async () => {
      await render();
      component['newEmail'].setValue('jane@new.example.com');

      await component['onChangeEmail']();
      clerkUser.update(user => ({
        ...user,
        primaryEmailAddress: { emailAddress: 'jane@new.example.com' },
      }));
      component['emailCode'].setValue(' 123456 ');
      await component['onVerifyEmail']();

      expect(clerk.createEmail).toHaveBeenCalledWith('jane@new.example.com');
      expect(clerk.verifyAndSetPrimaryEmail).toHaveBeenCalledWith('email_new', '123456');
      expect(component['emailStep']()).toBe('idle');
      expect(component['newEmail'].value).toBe('jane@new.example.com');
      expect(toast.show).toHaveBeenCalledWith(
        'Successfully changed your email address.',
        {
          title: 'Email updated',
          variant: 'success',
        },
      );
    });

    it('should not offer to change the email to the one already in use', async () => {
      await render();

      component['newEmail'].setValue('jane@example.com');

      expect(component['canSubmitEmail']()).toBe(false);
    });

    it('should show why a new address was refused', async () => {
      await render();
      component['newEmail'].setValue('taken@example.com');
      clerk.createEmail.mockRejectedValue(new Error('That email address is taken.'));

      await component['onChangeEmail']();

      expect(component['emailError']()).toBe('That email address is taken.');
      expect(component['emailStep']()).toBe('idle');
    });
  });

  describe('changing the password', () => {
    const fillPasswords = (): void => {
      component['passwordForm'].setValue({
        currentPassword: 'Old-pass-1234',
        passwords: { newPassword: 'N3w-pass-5678!', confirmPassword: 'N3w-pass-5678!' },
      });
    };

    it('should change it, log out other devices and say so', async () => {
      await render();
      fillPasswords();

      await component['onChangePassword']();

      expect(api.post).toHaveBeenCalledWith('/users/me/password', {
        currentPassword: 'Old-pass-1234',
        newPassword: 'N3w-pass-5678!',
      });
      expect(api.post).toHaveBeenCalledWith('/users/me/sessions/revoke-others', {});
      expect(toast.show).toHaveBeenCalledWith('Successfully changed your password.', {
        title: 'Password updated',
        variant: 'success',
      });
    });

    it('should mark the current password when it is wrong', async () => {
      await render();
      fillPasswords();
      api.post.mockRejectedValue(new ApiError('The current password is incorrect.', 400));

      await component['onChangePassword']();

      expect(component['currentPasswordError']()).toBe(
        'The current password is incorrect.',
      );
      expect(toast.show).not.toHaveBeenCalled();
    });

    it('should not ask for a current password on an account without one', async () => {
      clerkUser.update(user => ({ ...user, passwordEnabled: false }));
      await render();

      expect(component['passwordForm'].controls.currentPassword.disabled).toBe(true);
    });
  });

  describe('security', () => {
    it('should list the current session first, then the others by recency', async () => {
      await render('security');
      await Promise.all(api.get.mock.results.map(({ value }) => value));
      fixture.detectChanges();

      const devices = queryAll(fixture.debugElement, '.session__device').map(
        ({ nativeElement }) => nativeElement.textContent.trim(),
      );

      expect(devices).toEqual([
        'Chrome · Laptop',
        'Unknown browser · Desktop',
        'Safari · Mobile',
      ]);
    });

    it('should log out every other device and refresh the list', async () => {
      await render('security');
      api.get.mockClear();

      await component['onRevokeOtherSessions']();

      expect(api.post).toHaveBeenCalledWith('/users/me/sessions/revoke-others', {});
      expect(api.get).toHaveBeenCalledWith('/users/me/sessions');
      expect(toast.show).toHaveBeenCalledWith(
        'Successfully logged out of all your other devices.',
        { title: 'Logout', variant: 'success' },
      );
    });
  });

  describe('deleting the account', () => {
    it('should delete it, log out and go home', async () => {
      const navigate = vi
        .spyOn(TestBed.inject(Router), 'navigate')
        .mockResolvedValue(true);
      await render('danger');

      await component['onConfirmDelete']();

      expect(clerk.expectSessionEnd).toHaveBeenCalled();
      expect(api.delete).toHaveBeenCalledWith('/users/me');
      expect(clerk.logOut).toHaveBeenCalled();
      expect(navigate).toHaveBeenCalledWith(['/']);
    });

    it('should stay put and explain a deletion that fails', async () => {
      await render('danger');
      api.delete.mockRejectedValue(new Error('Something went wrong'));

      await component['onConfirmDelete']();

      expect(clerk.logOut).not.toHaveBeenCalled();
      expect(toast.show).toHaveBeenCalledWith('Something went wrong.', {
        title: 'Deletion failed',
        variant: 'error',
      });
    });
  });

  it('should remove a photo and reload the names and photos shown around the site', async () => {
    userService.hasAvatar.set(true);
    await render();
    component['onRemoveAvatar']();

    await component['onSavePhoto']();

    expect(api.delete).toHaveBeenCalledWith('/users/me/avatar');
    expect(userService.clearAvatar).toHaveBeenCalled();
    expect(memberProfiles.reload).toHaveBeenCalled();
    expect(toast.show).toHaveBeenCalledWith('Successfully updated your photo.', {
      title: 'Profile updated',
      variant: 'success',
    });
  });
});
