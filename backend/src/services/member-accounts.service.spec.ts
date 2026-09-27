import { ClerkAPIResponseError } from '@clerk/backend/errors';
import { Types } from 'mongoose';

import { MemberModel } from '../models/member.model';
import { clerkClient } from '../testing/clerk.mock';
import { useTestDatabase } from '../testing/database';
import {
  createAccountHolder,
  createMember,
  readMember,
  startMemberNumbers,
} from '../testing/fixtures';
import { send, sentKeys } from '../testing/storage.mock';
import {
  ClerkProfile,
  findEditor,
  linkClerkUser,
  syncClerkUser,
  unlinkClerkUser,
} from './member-accounts.service';

vi.mock('./clerk.service', () => import('../testing/clerk.mock.js'));
vi.mock('./storage.service', () => import('../testing/storage.mock.js'));

const USER = 'user_test';
const AVATARS = 'https://avatars.test';
const NOW = new Date('2026-09-26T12:00:00.000Z');

function profile(overrides: Partial<ClerkProfile> = {}): ClerkProfile {
  return {
    id: USER,
    email: 'jane@example.com',
    firstName: 'Jane',
    lastName: 'Doe',
    imageUrl: 'https://img.clerk.com/placeholder',
    hasImage: false,
    isAdmin: false,
    memberId: null,
    ...overrides,
  };
}

function serveClerkPhoto(): void {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(new Uint8Array([1, 2, 3]), { headers: { 'content-type': 'image/png' } }),
  );
}

describe('member accounts', () => {
  useTestDatabase();

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
    vi.stubEnv('R2_AVATARS_PUBLIC_URL', AVATARS);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('findEditor', () => {
    it('should credit the admin by their member name and number', async () => {
      await createAccountHolder({}, { number: 4 });

      const editor = await findEditor(USER);

      expect(editor).toEqual({ name: 'Jane Doe', number: 4 });
    });

    it('should refuse a user without a member record', async () => {
      await expect(findEditor(USER)).rejects.toThrow(
        'The signed-in admin has no member record.',
      );
    });
  });

  describe('linkClerkUser', () => {
    it('should link, number and copy the Clerk photo of a new user', async () => {
      await startMemberNumbers(3);
      const member = await createMember({ email: 'old@example.com' });
      serveClerkPhoto();

      const linked = await linkClerkUser(
        profile({
          memberId: member._id.toString(),
          hasImage: true,
          imageUrl: 'https://img.clerk.com/photo',
          isAdmin: true,
        }),
      );

      expect(linked).toMatchObject({ number: 3, email: 'jane@example.com' });
      expect(linked?.account).toMatchObject({
        clerkUserId: USER,
        isAdmin: true,
        clerkImageUrl: 'https://img.clerk.com/photo',
        avatarUrl: `${AVATARS}/avatars/user_test/original`,
        avatarUpdatedAt: NOW.toISOString(),
      });
      expect(sentKeys()).toEqual(['avatars/user_test/original']);
    });

    it('should keep the link when the Clerk photo cannot be copied', async () => {
      await startMemberNumbers(3);
      const member = await createMember();
      vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'));

      const linked = await linkClerkUser(
        profile({ memberId: member._id.toString(), hasImage: true }),
      );

      expect(linked?.account?.clerkUserId).toBe(USER);
      expect(linked?.account?.avatarUrl).toBeNull();
    });

    it('should return an existing link without changing it', async () => {
      const existing = await createAccountHolder();
      const other = await createMember();

      const linked = await linkClerkUser(profile({ memberId: other._id.toString() }));

      expect(linked?._id.toString()).toBe(existing._id.toString());
      expect((await readMember(other._id)).account).toBeNull();
    });

    it('should link nothing without a valid member id', async () => {
      const missing = await linkClerkUser(profile());
      const malformed = await linkClerkUser(profile({ memberId: 'nope' }));

      expect(missing).toBeNull();
      expect(malformed).toBeNull();
    });

    it('should leave a member already linked to another user alone', async () => {
      const member = await createAccountHolder({ clerkUserId: 'user_other' });

      const linked = await linkClerkUser(profile({ memberId: member._id.toString() }));

      expect(linked).toBeNull();
      expect(clerkClient.users.getUser).not.toHaveBeenCalled();
    });

    it('should drop the link to a user Clerk has since deleted', async () => {
      const member = await createMember();
      clerkClient.users.getUser.mockRejectedValue(
        new ClerkAPIResponseError('Not found', { status: 404, data: [] }),
      );

      const linked = await linkClerkUser(profile({ memberId: member._id.toString() }));

      expect(linked).toBeNull();
      expect((await readMember(member._id)).account).toBeNull();
    });

    it('should drop the link and fail when Clerk cannot confirm the user', async () => {
      const member = await createMember();
      clerkClient.users.getUser.mockRejectedValue(new Error('Clerk is down'));

      await expect(
        linkClerkUser(profile({ memberId: member._id.toString() })),
      ).rejects.toThrow('Clerk is down');
      expect((await readMember(member._id)).account).toBeNull();
    });

    it('should settle a race lost to another link on the unique index', async () => {
      const member = await createMember();
      const duplicate = Object.assign(new Error('E11000 duplicate key'), { code: 11000 });
      vi.spyOn(MemberModel, 'updateOne').mockRejectedValueOnce(duplicate);

      const linked = await linkClerkUser(profile({ memberId: member._id.toString() }));

      expect(linked).toBeNull();
    });

    it('should pass on any other database failure', async () => {
      const member = await createMember();
      vi.spyOn(MemberModel, 'updateOne').mockRejectedValueOnce(new Error('down'));

      await expect(
        linkClerkUser(profile({ memberId: member._id.toString() })),
      ).rejects.toThrow('down');
    });
  });

  describe('syncClerkUser', () => {
    it('should link a user who has no member record yet', async () => {
      await startMemberNumbers(3);
      const member = await createMember();

      await syncClerkUser(profile({ memberId: member._id.toString() }));

      expect((await readMember(member._id)).account?.clerkUserId).toBe(USER);
    });

    it('should only note the URL of a photo the app itself is changing', async () => {
      const member = await createAccountHolder({
        clerkImagePending: true,
        avatarUrl: `${AVATARS}/avatars/user_test/cropped`,
      });

      await syncClerkUser(
        profile({ hasImage: true, imageUrl: 'https://img.clerk.com/new' }),
      );

      expect(send).not.toHaveBeenCalled();
      expect((await readMember(member._id)).account).toMatchObject({
        clerkImageUrl: 'https://img.clerk.com/new',
        clerkImagePending: false,
        avatarUrl: `${AVATARS}/avatars/user_test/cropped`,
      });
    });

    it('should take a photo set in Clerk over the one the app managed', async () => {
      const member = await createAccountHolder({
        avatarManagedByApp: true,
        avatarCropState: { zoom: 2, offsetX: 1, offsetY: 1 },
      });
      serveClerkPhoto();

      await syncClerkUser(
        profile({ hasImage: true, imageUrl: 'https://img.clerk.com/new' }),
      );

      expect((await readMember(member._id)).account).toMatchObject({
        clerkImageUrl: 'https://img.clerk.com/new',
        avatarUrl: `${AVATARS}/avatars/user_test/original`,
        avatarOriginalUrl: `${AVATARS}/avatars/user_test/original`,
        avatarManagedByApp: false,
        avatarCropState: { zoom: 1, offsetX: 0, offsetY: 0 },
      });
    });

    it('should still sync the rest when a new Clerk photo cannot be copied', async () => {
      const member = await createAccountHolder();
      vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'));

      await syncClerkUser(
        profile({ hasImage: true, imageUrl: 'https://img.clerk.com/new', isAdmin: true }),
      );

      expect((await readMember(member._id)).account).toMatchObject({
        clerkImageUrl: 'https://img.clerk.com/new',
        isAdmin: true,
        avatarUrl: null,
      });
    });

    it('should clear the avatar when the photo is removed in Clerk', async () => {
      const member = await createAccountHolder({
        clerkImageUrl: 'https://img.clerk.com/old',
        avatarUrl: `${AVATARS}/avatars/user_test/cropped`,
        avatarOriginalUrl: `${AVATARS}/avatars/user_test/original`,
      });
      send.mockRejectedValue(new Error('Not found'));

      await syncClerkUser(profile());

      expect((await readMember(member._id)).account).toMatchObject({
        clerkImageUrl: null,
        avatarUrl: null,
        avatarOriginalUrl: null,
      });
    });

    it('should leave the avatar alone while the photo is unchanged', async () => {
      const member = await createAccountHolder({
        clerkImageUrl: 'https://img.clerk.com/old',
        avatarUrl: `${AVATARS}/avatars/user_test/cropped`,
      });

      await syncClerkUser(
        profile({
          hasImage: true,
          imageUrl: 'https://img.clerk.com/old',
          email: 'new@example.com',
        }),
      );

      const synced = await readMember(member._id);
      expect(send).not.toHaveBeenCalled();
      expect(synced.email).toBe('new@example.com');
      expect(synced.account?.avatarUrl).toBe(`${AVATARS}/avatars/user_test/cropped`);
    });
  });

  describe('unlinkClerkUser', () => {
    it('should take the account off the member and delete the stored avatar', async () => {
      const member = await createAccountHolder();

      await unlinkClerkUser(USER);

      expect((await readMember(member._id)).account).toBeNull();
      expect(sentKeys().sort()).toEqual([
        'avatars/user_test/cropped',
        'avatars/user_test/original',
      ]);
    });

    it('should unlink even when there is no stored avatar', async () => {
      const member = await createAccountHolder();
      send.mockRejectedValue(new Error('Not found'));

      await unlinkClerkUser(USER);

      expect((await readMember(member._id)).account).toBeNull();
    });

    it('should leave other members alone', async () => {
      const other = await createAccountHolder({ clerkUserId: 'user_other' });

      await unlinkClerkUser(new Types.ObjectId().toString());

      expect((await readMember(other._id)).account).not.toBeNull();
    });
  });
});
