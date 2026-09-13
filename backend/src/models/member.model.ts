import { Schema, model } from 'mongoose';

import { Id, IsoDate } from './core.model';
import { ModificationInfo } from './modification-info.model';
import { SortingConfig } from './pagination.model';

export interface Member {
  id: Id;
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
  // Derived from the users collection when serving responses; never stored
  isAdmin?: boolean;
  dateJoined: IsoDate;
  modificationInfo: ModificationInfo;
}

const memberSchema = new Schema<Member>(
  {
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
  },
  { versionKey: false },
);

export const MemberModel = model<Member>('Member', memberSchema);

export const memberTypes: Record<keyof Omit<Member, 'isAdmin'>, string | string[]> = {
  id: 'string',
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
