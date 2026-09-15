import { Types } from 'mongoose';

import { MemberRecord } from '../models/member.model';
import {
  PUBLIC_MEMBER_PROJECTION,
  PUBLIC_PROFILE_PROJECTION,
  toAccountRecord,
  toAdminMember,
  toMemberProfiles,
  toPublicMember,
  toPublicProfile,
} from './member-responses.util';

const PRIVATE_MEMBER_FIELDS = [
  'email',
  'phoneNumber',
  'yearOfBirth',
  'dateJoined',
  'account',
  'hasAccount',
];

function buildRecord(overrides: Partial<MemberRecord> = {}): MemberRecord {
  return {
    _id: new Types.ObjectId('507f1f77bcf86cd799439011'),
    number: 7,
    firstName: 'Jane',
    lastName: 'Doe',
    rating: '1500',
    peakRating: '1600',
    email: 'jane@example.com',
    phoneNumber: '555-123-4567',
    city: 'London',
    yearOfBirth: '1990',
    chessComUsername: 'janedoe',
    lichessUsername: 'jane_doe',
    isActive: true,
    dateJoined: '2022-08-18T04:00:00.000Z',
    modificationInfo: {
      createdBy: 'Admin One',
      createdByNumber: 3,
      dateCreated: '2022-08-18T04:00:00.000Z',
      lastEditedBy: 'Admin Two',
      lastEditedByNumber: null,
      dateLastEdited: '2024-01-01T00:00:00.000Z',
    },
    account: {
      clerkUserId: 'user_123',
      isAdmin: true,
      clerkImageUrl: 'https://img.clerk.com/photo',
      avatarUrl: 'https://avatars.example.com/cropped',
      avatarOriginalUrl: 'https://avatars.example.com/original',
      avatarManagedByApp: true,
      avatarCropState: { zoom: 1, offsetX: 0, offsetY: 0 },
      avatarUpdatedAt: '2024-01-01T00:00:00.000Z',
    },
    ...overrides,
  };
}

describe('PUBLIC_MEMBER_PROJECTION', () => {
  it('should never read a private field from the database', () => {
    const readFields = Object.keys(PUBLIC_MEMBER_PROJECTION).map(
      path => path.split('.')[0],
    );
    const readAccountPaths = Object.keys(PUBLIC_MEMBER_PROJECTION).filter(path =>
      path.startsWith('account.'),
    );

    const leakedFields = readFields.filter(
      field => field !== 'account' && PRIVATE_MEMBER_FIELDS.includes(field),
    );

    expect(leakedFields).toEqual([]);
    expect(readAccountPaths.sort()).toEqual([
      'account.avatarUpdatedAt',
      'account.avatarUrl',
      'account.isAdmin',
    ]);
  });
});

describe('PUBLIC_PROFILE_PROJECTION', () => {
  it('should read only the year of birth and join date beyond the public member fields', () => {
    const extraFields = Object.keys(PUBLIC_PROFILE_PROJECTION).filter(
      field => !(field in PUBLIC_MEMBER_PROJECTION),
    );

    expect(extraFields.sort()).toEqual(['dateJoined', 'yearOfBirth']);
  });
});

describe('toPublicProfile', () => {
  it('should add only the year of birth and the year joined to the public member', () => {
    const profile = toPublicProfile(buildRecord());

    expect(profile.yearOfBirth).toBe('1990');
    expect(profile.yearJoined).toBe('2022');
    expect(Object.keys(profile)).not.toContain('dateJoined');
    expect(JSON.stringify(profile)).not.toContain('jane@example.com');
    expect(JSON.stringify(profile)).not.toContain('555-123-4567');
  });
});

describe('toPublicMember', () => {
  it('should return only the public fields, even when given a full record', () => {
    const member = toPublicMember(buildRecord());

    expect(Object.keys(member).sort()).toEqual(
      [
        'avatarUrl',
        'chessComUsername',
        'city',
        'firstName',
        'id',
        'isActive',
        'isAdmin',
        'lastName',
        'lichessUsername',
        'modificationInfo',
        'number',
        'peakRating',
        'rating',
      ].sort(),
    );
    expect(JSON.stringify(member)).not.toContain('jane@example.com');
    expect(JSON.stringify(member)).not.toContain('555-123-4567');
    expect(JSON.stringify(member)).not.toContain('user_123');
    expect(JSON.stringify(member)).not.toContain('original');
  });

  it('should drop unknown fields added to the record later', () => {
    const record = { ...buildRecord(), secretNote: 'do not share' };

    const member = toPublicMember(record);

    expect(JSON.stringify(member)).not.toContain('do not share');
  });

  it('should give the profile number for a member with an account', () => {
    const member = toPublicMember(buildRecord());

    expect(member.number).toBe(7);
  });

  it('should version the avatar URL by its upload time so a new photo is never served from cache', () => {
    const record = buildRecord();
    const reuploaded = buildRecord({
      account: { ...record.account!, avatarUpdatedAt: '2024-02-01T00:00:00.000Z' },
    });

    const member = toPublicMember(record);
    const updatedMember = toPublicMember(reuploaded);

    expect(member.avatarUrl).toBe('https://avatars.example.com/cropped?v=1704067200000');
    expect(updatedMember.avatarUrl).toBe(
      'https://avatars.example.com/cropped?v=1706745600000',
    );
  });

  it('should pass on the member numbers of the creator and last editor', () => {
    const member = toPublicMember(buildRecord());

    expect(member.modificationInfo.createdByNumber).toBe(3);
    expect(member.modificationInfo.lastEditedByNumber).toBeNull();
  });

  it('should handle a member without an account', () => {
    const member = toPublicMember(buildRecord({ account: null }));

    expect(member.number).toBeNull();
    expect(member.avatarUrl).toBeNull();
    expect(member.isAdmin).toBe(false);
  });
});

describe('toAdminMember', () => {
  it('should add the private member details and whether they have an account, but no account internals', () => {
    const member = toAdminMember(buildRecord());

    expect(member.email).toBe('jane@example.com');
    expect(member.phoneNumber).toBe('555-123-4567');
    expect(member.hasAccount).toBe(true);
    expect(JSON.stringify(member)).not.toContain('user_123');
    expect(JSON.stringify(member)).not.toContain('original');
  });

  it('should report when a member has no account', () => {
    const member = toAdminMember(buildRecord({ account: null }));

    expect(member.hasAccount).toBe(false);
  });
});

describe('toMemberProfiles', () => {
  it('should list only members with an account and a number', () => {
    const records = [
      buildRecord(),
      buildRecord({ number: undefined }),
      buildRecord({ number: 9, account: null }),
    ];

    const profiles = toMemberProfiles(records);

    expect(profiles).toEqual([
      {
        number: 7,
        firstName: 'Jane',
        lastName: 'Doe',
        avatarUrl: 'https://avatars.example.com/cropped?v=1704067200000',
      },
    ]);
  });
});

describe('toAccountRecord', () => {
  it('should map the linked account for its own user', () => {
    const record = buildRecord();

    const account = toAccountRecord({
      ...record,
      account: { ...record.account!, clerkUserId: 'user_123' },
    });

    expect(account.id).toBe('user_123');
    expect(account.memberNumber).toBe(7);
    expect(account.avatarOriginalUrl).toBe('https://avatars.example.com/original');
  });
});
