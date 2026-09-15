import { Schema, Types, model } from 'mongoose';

import { Id, IsoDate } from './core.model';
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
  avatarManagedByApp: boolean;
  avatarCropState: AvatarCropState | null;
  avatarUpdatedAt: IsoDate | null;
  // Set while the member still uses the password the site emailed them
  temporaryPasswordHash: string | null;
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
  isActive: boolean;
  dateJoined: IsoDate;
  modificationInfo: ModificationInfo;
  account: MemberAccount | null;
}

export type MemberRecord = Omit<Member, 'id'> & { _id: Types.ObjectId };

// The number and account belong to the server, so admins never write them
export type EditableMemberFields = Omit<Member, 'id' | 'number' | 'account'>;

const accountSchema = new Schema<MemberAccount>(
  {
    clerkUserId: { type: String, required: true },
    isAdmin: { type: Boolean, default: false },
    clerkImageUrl: { type: String, default: null },
    avatarUrl: { type: String, default: null },
    avatarOriginalUrl: { type: String, default: null },
    avatarManagedByApp: { type: Boolean, default: false },
    avatarCropState: {
      type: { zoom: Number, offsetX: Number, offsetY: Number },
      default: null,
      _id: false,
    },
    avatarUpdatedAt: { type: String, default: null },
    temporaryPasswordHash: { type: String, default: null },
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
    isActive: { type: Boolean, required: true },
    dateJoined: { type: String, required: true },
    modificationInfo: { type: Object, required: true },
    account: { type: accountSchema, default: null },
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
    isActive: 'boolean',
    dateJoined: 'string',
    modificationInfo: 'object',
  };

export const memberSortingConfig: SortingConfig = {
  fieldMappings: {
    name: 'lastName',
    born: 'yearOfBirth',
    lastUpdated: 'modificationInfo.dateLastEdited',
  },
  secondarySort: {
    name: 'firstName',
    lastName: 'firstName',
  },
  searchableFields: [
    'firstName',
    'lastName',
    'city',
    'chessComUsername',
    'lichessUsername',
  ],
};
