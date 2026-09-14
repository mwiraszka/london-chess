import { IsoDate } from '../models/core.model';
import {
  AccountStatus,
  AvatarCropState,
  MemberAccount,
  MemberRecord,
} from '../models/member.model';
import { ModificationInfo } from '../models/modification-info.model';

export interface PublicMember {
  id: string;
  number: number | null;
  firstName: string;
  lastName: string;
  rating: string;
  peakRating: string;
  city: string;
  chessComUsername: string;
  lichessUsername: string;
  isActive: boolean;
  modificationInfo: ModificationInfo;
  isAdmin: boolean;
  avatarUrl: string | null;
}

export interface AdminMember extends PublicMember {
  email: string;
  phoneNumber: string;
  yearOfBirth: string;
  dateJoined: IsoDate;
  accountStatus: AccountStatus | 'none';
}

export interface AccountRecord {
  id: string;
  memberNumber: number | null;
  firstName: string;
  lastName: string;
  email: string;
  isAdmin: boolean;
  clerkImageUrl: string | null;
  avatarUrl: string | null;
  avatarOriginalUrl: string | null;
  avatarCropState: AvatarCropState | null;
  avatarUpdatedAt: IsoDate | null;
}

export interface MemberProfile {
  number: number;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
}

export type LinkedMemberRecord = MemberRecord & {
  account: MemberAccount & { clerkUserId: string };
};

// The only fields a public request reads from the database. Responses are then
// rebuilt field by field, so a field added to members later stays private until
// it is deliberately listed here and in toPublicMember
export const PUBLIC_MEMBER_PROJECTION = {
  number: 1,
  firstName: 1,
  lastName: 1,
  rating: 1,
  peakRating: 1,
  city: 1,
  chessComUsername: 1,
  lichessUsername: 1,
  isActive: 1,
  modificationInfo: 1,
  'account.status': 1,
  'account.isAdmin': 1,
  'account.avatarUrl': 1,
} as const;

export const MEMBER_PROFILE_PROJECTION = {
  number: 1,
  firstName: 1,
  lastName: 1,
  'account.status': 1,
  'account.avatarUrl': 1,
} as const;

export function toMemberProfiles(records: MemberRecord[]): MemberProfile[] {
  return records.flatMap(record =>
    typeof record.number === 'number' && record.account?.status === 'active'
      ? [
          {
            number: record.number,
            firstName: record.firstName,
            lastName: record.lastName,
            avatarUrl: record.account.avatarUrl ?? null,
          },
        ]
      : [],
  );
}

export function toPublicMember(record: MemberRecord): PublicMember {
  const account = record.account?.status === 'active' ? record.account : null;

  return {
    id: record._id.toString(),
    // A profile page exists only while the account is active
    number: account ? (record.number ?? null) : null,
    firstName: record.firstName,
    lastName: record.lastName,
    rating: record.rating,
    peakRating: record.peakRating,
    city: record.city,
    chessComUsername: record.chessComUsername,
    lichessUsername: record.lichessUsername,
    isActive: record.isActive,
    modificationInfo: {
      createdBy: record.modificationInfo.createdBy,
      createdByNumber: record.modificationInfo.createdByNumber ?? null,
      dateCreated: record.modificationInfo.dateCreated,
      lastEditedBy: record.modificationInfo.lastEditedBy,
      lastEditedByNumber: record.modificationInfo.lastEditedByNumber ?? null,
      dateLastEdited: record.modificationInfo.dateLastEdited,
    },
    isAdmin: account?.isAdmin === true,
    avatarUrl: account?.avatarUrl ?? null,
  };
}

export function toAdminMember(record: MemberRecord): AdminMember {
  return {
    ...toPublicMember(record),
    email: record.email,
    phoneNumber: record.phoneNumber,
    yearOfBirth: record.yearOfBirth,
    dateJoined: record.dateJoined,
    accountStatus: record.account?.status ?? 'none',
  };
}

export function toAccountRecord(record: LinkedMemberRecord): AccountRecord {
  return {
    id: record.account.clerkUserId,
    memberNumber: record.number ?? null,
    firstName: record.firstName,
    lastName: record.lastName,
    email: record.email,
    isAdmin: record.account.isAdmin,
    clerkImageUrl: record.account.clerkImageUrl,
    avatarUrl: record.account.avatarUrl,
    avatarOriginalUrl: record.account.avatarOriginalUrl,
    avatarCropState: record.account.avatarCropState,
    avatarUpdatedAt: record.account.avatarUpdatedAt,
  };
}
