import { Schema, Types, model } from 'mongoose';

import { Id, IsoDate } from './core.model';
import {
  StoredExternalRatings,
  storedExternalRatingsSchema,
} from './external-rating.model';
import { ModificationInfo } from './modification-info.model';
import { SortingConfig } from './pagination.model';

export interface AvatarCropState {
  zoom: number;
  offsetX: number;
  offsetY: number;
}

export interface MemberAccount {
  clerkUserId: string;
  isAdmin: boolean;
  clerkImageUrl: string | null;
  avatarUrl: string | null;
  avatarOriginalUrl: string | null;
  // Set while the app changes the Clerk photo itself, so the webhook it raises is not
  // taken for a change made in Clerk
  clerkImagePending: boolean;
  avatarCropState: AvatarCropState | null;
  avatarUpdatedAt: IsoDate | null;
  // Set while the member still uses the password the site emailed them
  temporaryPasswordHash: string | null;
  // When the account was opened, null until copied over for accounts opened before it
  // was kept
  createdAt: IsoDate | null;
}

// An account just made, with no photo yet
export function newMemberAccount(
  clerkUserId: string,
  details: Partial<
    Pick<MemberAccount, 'isAdmin' | 'clerkImageUrl' | 'temporaryPasswordHash'>
  > = {},
): MemberAccount {
  return {
    clerkUserId,
    isAdmin: false,
    clerkImageUrl: null,
    avatarUrl: null,
    avatarOriginalUrl: null,
    clerkImagePending: false,
    avatarCropState: null,
    avatarUpdatedAt: null,
    temporaryPasswordHash: null,
    createdAt: new Date().toISOString(),
    ...details,
  };
}

// The looks a member can give the site, each its own colours and type
export const BRANDS = ['modern', 'classic', 'sunset', 'newsprint', 'playground'] as const;
export type Brand = (typeof BRANDS)[number];

interface MemberPreferences {
  showYearOfBirth: boolean;
  brand: Brand;
  notifyRatingChanges: boolean;
  notifyScheduleChanges: boolean;
}

export interface Member {
  id: Id;
  // Assigned when the member is first linked to an account
  number?: number;
  firstName: string;
  lastName: string;
  rating: string;
  peakRating: string;
  email: string;
  phoneNumber: string;
  city: string;
  yearOfBirth: string;
  chessComUsername: string;
  lichessUsername: string;
  // Absent on records saved before members could give them
  fideId?: string;
  cfcId?: string;
  isActive: boolean;
  dateJoined: IsoDate;
  modificationInfo: ModificationInfo;
  account: MemberAccount | null;
  // Absent on records saved before the member had anything to choose
  preferences?: MemberPreferences;
  // Absent until a profile view first looks the member up on other sites
  externalRatings?: StoredExternalRatings | null;
}

export type MemberRecord = Omit<Member, 'id'> & { _id: Types.ObjectId };

// Only a member with an account has a profile to show
export const profileMemberFilter = (number: number) => ({
  number,
  'account.clerkUserId': { $ne: null },
});

// Enough of a member to name them and link to their profile
export type MemberName = Pick<MemberRecord, '_id' | 'firstName' | 'lastName' | 'number'>;

// The number, account and preferences belong to the member, and the external ratings to
// the sites they come from, so admins never write them
export type EditableMemberFields = Omit<
  Member,
  'id' | 'number' | 'account' | 'preferences' | 'externalRatings'
>;

const accountSchema = new Schema<MemberAccount>(
  {
    clerkUserId: { type: String, required: true },
    isAdmin: { type: Boolean, default: false },
    clerkImageUrl: { type: String, default: null },
    avatarUrl: { type: String, default: null },
    avatarOriginalUrl: { type: String, default: null },
    clerkImagePending: { type: Boolean, default: false },
    avatarCropState: {
      type: { zoom: Number, offsetX: Number, offsetY: Number },
      default: null,
      _id: false,
    },
    avatarUpdatedAt: { type: String, default: null },
    temporaryPasswordHash: { type: String, default: null },
    createdAt: { type: String, default: null },
  },
  { _id: false },
);

const preferencesSchema = new Schema<MemberPreferences>(
  {
    showYearOfBirth: { type: Boolean, default: false },
    brand: { type: String, enum: BRANDS, default: 'modern' },
    notifyRatingChanges: { type: Boolean, default: true },
    notifyScheduleChanges: { type: Boolean, default: true },
  },
  { _id: false },
);

const memberSchema = new Schema<Member>(
  {
    number: { type: Number },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    rating: { type: String, required: true },
    peakRating: { type: String, required: true },
    email: { type: String, default: '' },
    phoneNumber: { type: String, default: '' },
    city: { type: String, required: true },
    yearOfBirth: { type: String, default: '' },
    chessComUsername: { type: String, default: '' },
    lichessUsername: { type: String, default: '' },
    fideId: { type: String, default: '' },
    cfcId: { type: String, default: '' },
    isActive: { type: Boolean, required: true },
    dateJoined: { type: String, required: true },
    modificationInfo: { type: Object, required: true },
    account: { type: accountSchema, default: null },
    preferences: { type: preferencesSchema, default: () => ({}) },
    externalRatings: { type: storedExternalRatingsSchema, default: null },
  },
  { versionKey: false },
);

// Partial, since most members never have an account and so never get a number
memberSchema.index(
  { number: 1 },
  { unique: true, partialFilterExpression: { number: { $type: 'number' } } },
);
memberSchema.index(
  { 'account.clerkUserId': 1 },
  {
    unique: true,
    partialFilterExpression: { 'account.clerkUserId': { $type: 'string' } },
  },
);

export const MemberModel = model<Member>('Member', memberSchema);

export const editableMemberTypes: Record<keyof EditableMemberFields, string | string[]> =
  {
    firstName: 'string',
    lastName: 'string',
    rating: 'string',
    peakRating: 'string',
    email: 'string',
    phoneNumber: 'string',
    city: 'string',
    yearOfBirth: 'string',
    chessComUsername: 'string',
    lichessUsername: 'string',
    fideId: 'string',
    cfcId: 'string',
    isActive: 'boolean',
    dateJoined: 'string',
    modificationInfo: 'object',
  };

export const memberSortingConfig: SortingConfig = {
  fieldMappings: {
    name: 'lastName',
    born: 'yearOfBirth',
    lastUpdated: 'modificationInfo.dateLastEdited',
    accountOpened: 'account.createdAt',
  },
  secondarySort: {
    name: ['firstName'],
    lastName: ['firstName'],
  },
  searchableFields: [
    'firstName',
    'lastName',
    'city',
    'chessComUsername',
    'lichessUsername',
  ],
};
