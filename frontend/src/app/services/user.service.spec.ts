import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { UserRecord } from '@app/models';

import { environment } from '@env';

import { ApiService } from './api.service';
import { AuthDrawerService } from './auth-drawer.service';
import { ClerkService } from './clerk.service';
import { UserService } from './user.service';

interface FakeClerkUser {
  hasImage: boolean;
  imageUrl: string;
}

describe('UserService', () => {
  let service: UserService;
  let authDrawer: AuthDrawerService;

  let getSpy: Mock;
  let patchSpy: Mock;
  let logOutSpy: Mock;

  const isLoggedIn = signal(false);
  const clerkUser = signal<FakeClerkUser | null>(null);

  const record = (overrides: Partial<UserRecord> = {}): UserRecord => ({
    id: 'user_1',
    memberNumber: 42,
    firstName: 'Ann',
    lastName: 'Lee',
    email: 'ann@example.com',
    isAdmin: false,
    clerkImageUrl: null,
    avatarUrl: null,
    avatarOriginalUrl: null,
    avatarCropState: null,
    avatarUpdatedAt: null,
    hasTemporaryPassword: false,
    showYearOfBirth: false,
    ...overrides,
  });

  const logIn = async (): Promise<void> => {
    isLoggedIn.set(true);
    TestBed.tick();
    await service.load();
  };

  beforeEach(() => {
    isLoggedIn.set(false);
    clerkUser.set(null);
    getSpy = vi.fn().mockResolvedValue(record());
    patchSpy = vi.fn();
    logOutSpy = vi.fn().mockResolvedValue(undefined);

    TestBed.configureTestingModule({
      providers: [
        { provide: ApiService, useValue: { get: getSpy, patch: patchSpy } },
        {
          provide: ClerkService,
          useValue: { isLoggedIn, user: clerkUser, logOut: logOutSpy },
        },
      ],
    });

    service = TestBed.inject(UserService);
    authDrawer = TestBed.inject(AuthDrawerService);
    TestBed.tick();
  });

  describe('loading', () => {
    it('should load the user record on log in', async () => {
      await logIn();

      expect(getSpy).toHaveBeenCalledExactlyOnceWith('/users/me');
      expect(service.user()).toEqual(record());
      expect(service.memberNumber()).toBe(42);
    });

    it('should clear the user record on log out', async () => {
      await logIn();

      isLoggedIn.set(false);
      TestBed.tick();

      expect(service.user()).toBeNull();
      expect(service.memberNumber()).toBeNull();
    });

    it('should not fetch while logged out', async () => {
      await service.load();

      expect(getSpy).not.toHaveBeenCalled();
    });

    it('should share a load already in flight and fetch again once it settles', async () => {
      isLoggedIn.set(true);

      const first = service.load();
      const second = service.load();
      await first;
      await service.load();

      expect(second).toBe(first);
      expect(getSpy).toHaveBeenCalledTimes(2);
    });

    it('should keep the app working without a record when the fetch fails', async () => {
      getSpy.mockRejectedValue(new Error('offline'));

      await logIn();

      expect(service.user()).toBeNull();
    });

    it('should log out a session still on a temporary password', async () => {
      getSpy.mockResolvedValue(record({ hasTemporaryPassword: true }));

      await logIn();

      expect(logOutSpy).toHaveBeenCalled();
      expect(service.user()).toBeNull();
    });

    it('should keep a temporary password session the drawer is still completing', async () => {
      getSpy.mockResolvedValue(record({ hasTemporaryPassword: true }));
      authDrawer.isCompletingLogin.set(true);

      await logIn();

      expect(logOutSpy).not.toHaveBeenCalled();
      expect(service.user()?.hasTemporaryPassword).toBe(true);
    });
  });

  describe('Clerk image sync', () => {
    it('should store a changed Clerk image url', async () => {
      clerkUser.set({ hasImage: true, imageUrl: 'https://img.clerk.com/new' });
      const updated = record({ clerkImageUrl: 'https://img.clerk.com/new' });
      patchSpy.mockResolvedValue(updated);

      await logIn();

      expect(patchSpy).toHaveBeenCalledWith('/users/me', {
        clerkImageUrl: 'https://img.clerk.com/new',
      });
      expect(service.user()).toBe(updated);
    });

    it('should clear a stored Clerk image url once the image is removed', async () => {
      getSpy.mockResolvedValue(record({ clerkImageUrl: 'https://img.clerk.com/old' }));
      clerkUser.set({ hasImage: false, imageUrl: 'https://img.clerk.com/default' });
      patchSpy.mockResolvedValue(record());

      await logIn();

      expect(patchSpy).toHaveBeenCalledWith('/users/me', { clerkImageUrl: null });
    });

    it('should not update an unchanged Clerk image url', async () => {
      getSpy.mockResolvedValue(record({ clerkImageUrl: 'https://img.clerk.com/a' }));
      clerkUser.set({ hasImage: true, imageUrl: 'https://img.clerk.com/a' });

      await logIn();

      expect(patchSpy).not.toHaveBeenCalled();
    });

    it('should keep the loaded record when the image update fails', async () => {
      clerkUser.set({ hasImage: true, imageUrl: 'https://img.clerk.com/new' });
      patchSpy.mockRejectedValue(new Error('offline'));

      await logIn();

      expect(service.user()).toEqual(record());
    });
  });

  describe('avatar', () => {
    it('should serve the uploaded original through the API with a cache buster', () => {
      const avatarUpdatedAt = '2026-01-02T03:04:05.000Z';

      service.setUser(
        record({ avatarOriginalUrl: 'https://r2/original.png', avatarUpdatedAt }),
      );

      const expected = `${environment.lccApiBaseUrl}/users/user_1/avatar?t=${Date.parse(avatarUpdatedAt)}`;
      expect(service.fullSizeAvatarUrl()).toBe(expected);
      expect(service.avatarUrl()).toBe(expected);
      expect(service.hasAvatar()).toBe(true);
    });

    it('should use a zero cache buster when the upload time is unknown', () => {
      service.setUser(record({ avatarOriginalUrl: 'https://r2/original.png' }));

      expect(service.fullSizeAvatarUrl()).toBe(
        `${environment.lccApiBaseUrl}/users/user_1/avatar?t=0`,
      );
    });

    it('should fall back to the Clerk image without an uploaded avatar', () => {
      clerkUser.set({ hasImage: true, imageUrl: 'https://img.clerk.com/a' });

      service.setUser(record());

      expect(service.fullSizeAvatarUrl()).toBeUndefined();
      expect(service.avatarUrl()).toBe('https://img.clerk.com/a');
    });

    it('should have no avatar without an upload or a Clerk image', () => {
      clerkUser.set({ hasImage: false, imageUrl: 'https://img.clerk.com/default' });

      service.setUser(record());

      expect(service.avatarUrl()).toBeUndefined();
      expect(service.hasAvatar()).toBe(false);
    });

    it('should expose the crop state of the uploaded avatar', () => {
      const cropState = { zoom: 1.5, offsetX: 10, offsetY: -4 };

      service.setUser(record({ avatarCropState: cropState }));

      expect(service.avatarCropState()).toBe(cropState);
    });

    it('should clear the avatar fields of the current record', () => {
      service.setUser(
        record({
          avatarUrl: 'https://r2/cropped.png',
          avatarOriginalUrl: 'https://r2/original.png',
          avatarCropState: { zoom: 1.5, offsetX: 10, offsetY: -4 },
        }),
      );

      service.clearAvatar();

      expect(service.user()).toEqual(record());
      expect(service.avatarCropState()).toBeNull();
    });

    it('should do nothing when clearing the avatar without a record', () => {
      service.clearAvatar();

      expect(service.user()).toBeNull();
    });
  });
});
