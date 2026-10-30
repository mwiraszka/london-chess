import { IsoDate } from '../models/core.model';
import { ExternalRatings } from '../models/external-rating.model';
import {
  AvatarCropState,
  Brand,
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
  fideId: string;
  cfcId: string;
  yearOfBirth: string;
  showYearOfBirth: boolean;
  dateJoined: IsoDate;
  yearJoined: string;
  hasAccount: boolean;
}

// A profile page is public, so it shows years rather than full dates
export interface PublicProfile extends PublicMember {
  yearOfBirth: string;
  showYearOfBirth: boolean;
  yearJoined: string;
  fideId: string;
  cfcId: string;
  externalRatings: ExternalRatings;
}

export type AdminProfile = AdminMember & Pick<PublicProfile, 'externalRatings'>;

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
  hasTemporaryPassword: boolean;
  showYearOfBirth: boolean;
  brand: Brand;
  notifyRatingChanges: boolean;
  notifyScheduleChanges: boolean;
}

export interface MemberProfile {
  number: number;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
}

export type LinkedMemberRecord = MemberRecord & { account: MemberAccount };

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
  'account.isAdmin': 1,
  'account.avatarUrl': 1,
  'account.avatarUpdatedAt': 1,
} as const;

export const PUBLIC_PROFILE_PROJECTION = {
  ...PUBLIC_MEMBER_PROJECTION,
  yearOfBirth: 1,
  dateJoined: 1,
  preferences: 1,
  fideId: 1,
  cfcId: 1,
  externalRatings: 1,
} as const;

export const MEMBER_PROFILE_PROJECTION = {
  number: 1,
  firstName: 1,
  lastName: 1,
  'account.avatarUrl': 1,
  'account.avatarUpdatedAt': 1,
} as const;

export function toMemberProfiles(records: MemberRecord[]): MemberProfile[] {
  return records.flatMap(record =>
    typeof record.number === 'number' && record.account
      ? [
          {
            number: record.number,
            firstName: record.firstName,
            lastName: record.lastName,
            avatarUrl: versionedAvatarUrl(record.account),
          },
        ]
      : [],
  );
}

export function toPublicMember(record: MemberRecord): PublicMember {
  const { account } = record;

  return {
    id: record._id.toString(),
    // Only members with an account have a profile page
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
    avatarUrl: account ? versionedAvatarUrl(account) : null,
  };
}

export function toPublicProfile(
  record: MemberRecord,
  externalRatings: ExternalRatings,
): PublicProfile {
  const showYearOfBirth = showsYearOfBirth(record);

  return {
    ...toPublicMember(record),
    // The member decides whether their birth year is shown alongside the rest
    yearOfBirth: showYearOfBirth ? record.yearOfBirth : '',
    showYearOfBirth,
    yearJoined: yearOf(record.dateJoined),
    fideId: record.fideId ?? '',
    cfcId: record.cfcId ?? '',
    externalRatings,
  };
}

export function toAdminMember(record: MemberRecord): AdminMember {
  return {
    ...toPublicMember(record),
    email: record.email,
    phoneNumber: record.phoneNumber,
    fideId: record.fideId ?? '',
    cfcId: record.cfcId ?? '',
    yearOfBirth: record.yearOfBirth,
    showYearOfBirth: showsYearOfBirth(record),
    dateJoined: record.dateJoined,
    yearJoined: yearOf(record.dateJoined),
    hasAccount: !!record.account,
  };
}

function showsYearOfBirth(record: MemberRecord): boolean {
  return record.preferences?.showYearOfBirth === true;
}

function yearOf(date: IsoDate): string {
  return date.slice(0, 4);
}

// Avatars are stored under a fixed key, so the upload time versions the URL for caches
function versionedAvatarUrl({
  avatarUrl,
  avatarUpdatedAt,
}: MemberAccount): string | null {
  if (!avatarUrl || !avatarUpdatedAt) {
    return avatarUrl ?? null;
  }
  return `${avatarUrl}?v=${Date.parse(avatarUpdatedAt)}`;
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
    hasTemporaryPassword: !!record.account.temporaryPasswordHash,
    showYearOfBirth: showsYearOfBirth(record),
    brand: record.preferences?.brand ?? 'modern',
    notifyRatingChanges: record.preferences?.notifyRatingChanges ?? true,
    notifyScheduleChanges: record.preferences?.notifyScheduleChanges ?? true,
  };
}
