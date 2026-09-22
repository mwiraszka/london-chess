import { MemberRecord } from '../models/member.model';
import { MemberModel } from '../models/member.model';
import { uploadAvatar } from './avatar-storage.service';
import { syncClerkUser } from './member-accounts.service';

vi.mock('../models/member.model', () => ({
  MemberModel: { findOne: vi.fn(), findOneAndUpdate: vi.fn() },
}));
vi.mock('./avatar-storage.service', () => ({
  uploadAvatar: vi.fn(),
  deleteAvatar: vi.fn(),
}));
vi.mock('./clerk.service', () => ({ clerkClient: { users: { getUser: vi.fn() } } }));
vi.mock('./member-numbers.service', () => ({ assignMemberNumber: vi.fn() }));

const CLERK_USER_ID = 'user_1';

const member = (account: Partial<MemberRecord['account']>): MemberRecord =>
  ({
    _id: 'member-1',
    email: 'jane@example.com',
    account: {
      clerkUserId: CLERK_USER_ID,
      isAdmin: false,
      clerkImageUrl: 'https://img.clerk.com/old',
      avatarUrl: 'https://r2/avatars/user_1/cropped',
      avatarOriginalUrl: 'https://r2/avatars/user_1/original',
      avatarManagedByApp: true,
      clerkImagePending: false,
      avatarCropState: { zoom: 2, offsetX: 1, offsetY: 1 },
      avatarUpdatedAt: '2026-01-01T00:00:00.000Z',
      temporaryPasswordHash: null,
      ...account,
    },
  }) as unknown as MemberRecord;

const profile = (imageUrl: string) => ({
  id: CLERK_USER_ID,
  email: 'jane@example.com',
  firstName: 'Jane',
  lastName: 'Doe',
  imageUrl,
  hasImage: true,
  isAdmin: false,
  memberId: 'member-1',
});

describe('syncClerkUser', () => {
  const findOne = vi.mocked(MemberModel.findOne);
  const findOneAndUpdate = vi.mocked(MemberModel.findOneAndUpdate);

  const updatedFields = () =>
    findOneAndUpdate.mock.calls.map(([, update]) => (update as { $set: object }).$set);

  beforeEach(() => {
    vi.clearAllMocks();
    findOneAndUpdate.mockReturnValue({
      lean: () => Promise.resolve(member({})),
    } as unknown as ReturnType<typeof MemberModel.findOneAndUpdate>);
    vi.mocked(uploadAvatar).mockResolvedValue('https://r2/avatars/user_1/original');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(1)),
        headers: new Headers({ 'content-type': 'image/png' }),
      }),
    );
  });

  afterEach(() => vi.unstubAllGlobals());

  it('should only note the URL of a photo the app itself is changing', async () => {
    findOne.mockReturnValue({
      lean: () => Promise.resolve(member({ clerkImagePending: true })),
    } as unknown as ReturnType<typeof MemberModel.findOne>);

    await syncClerkUser(profile('https://img.clerk.com/new'));

    expect(uploadAvatar).not.toHaveBeenCalled();
    expect(updatedFields()).toEqual([
      expect.objectContaining({
        'account.clerkImageUrl': 'https://img.clerk.com/new',
        'account.clerkImagePending': false,
      }),
    ]);
    expect(updatedFields()[0]).not.toHaveProperty('account.avatarUrl');
  });

  it('should take a photo set in Clerk over the one the app managed', async () => {
    findOne.mockReturnValue({
      lean: () => Promise.resolve(member({})),
    } as unknown as ReturnType<typeof MemberModel.findOne>);

    await syncClerkUser(profile('https://img.clerk.com/new'));

    expect(uploadAvatar).toHaveBeenCalledWith(
      CLERK_USER_ID,
      expect.any(ArrayBuffer),
      'image/png',
    );
    expect(updatedFields()).toEqual([
      expect.objectContaining({
        'account.clerkImageUrl': 'https://img.clerk.com/new',
        'account.avatarUrl': 'https://r2/avatars/user_1/original',
        'account.avatarOriginalUrl': 'https://r2/avatars/user_1/original',
        'account.avatarManagedByApp': false,
        'account.avatarCropState': { zoom: 1, offsetX: 0, offsetY: 0 },
      }),
    ]);
  });

  it('should leave the avatar alone while the photo is unchanged', async () => {
    findOne.mockReturnValue({
      lean: () => Promise.resolve(member({})),
    } as unknown as ReturnType<typeof MemberModel.findOne>);

    await syncClerkUser(profile('https://img.clerk.com/old'));

    expect(uploadAvatar).not.toHaveBeenCalled();
    expect(updatedFields()).toEqual([
      {
        email: 'jane@example.com',
        'account.isAdmin': false,
        'account.clerkImageUrl': 'https://img.clerk.com/old',
      },
    ]);
  });
});
