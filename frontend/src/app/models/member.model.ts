import { FormControl } from '@angular/forms';

import { MEMBER_FORM_DATA_PROPERTIES } from '@app/constants';

import { Id, IsoDate, Url } from './core.model';
import { ModificationInfo } from './modification-info.model';

export interface Member {
  id: Id;
  // Null for members without an active account, who have no profile page
  number: number | null;
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
  isAdmin?: boolean;
  dateJoined: IsoDate;
  // Sent only with a profile page lookup or to admins
  yearJoined?: string;
  showYearOfBirth?: boolean;
  modificationInfo: ModificationInfo;
  avatarUrl: Url | null;
  // Only admins learn whether a member has an account
  hasAccount?: boolean;
}

// The number, avatar and account belong to the server, so admins never write them
export type EditableMember = MemberFormData & Pick<Member, 'modificationInfo'>;

export interface MemberProfile {
  number: number;
  firstName: string;
  lastName: string;
  avatarUrl: Url | null;
}

// The email a member was sent when an admin saved their details
export type MemberEmail = 'welcome' | 'changes';

export interface MemberRatingsUpdate {
  updatedIds: Id[];
  // Members with an account who could not be emailed their new rating
  unnotifiedMemberNames: string[];
}

export interface MemberDetailsFormData {
  firstName: string;
  lastName: string;
  yearOfBirth: number | null;
  city: string;
  phoneNumber: string;
  lichessUsername: string;
  chessComUsername: string;
}

export type MemberDetailsFormGroup = {
  [Property in keyof MemberDetailsFormData]: FormControl<MemberDetailsFormData[Property]>;
};

export type MemberAccountFormGroup = MemberDetailsFormGroup & {
  email: FormControl<string>;
};

export type MemberFormData = Pick<Member, (typeof MEMBER_FORM_DATA_PROPERTIES)[number]>;

export type MemberFormGroup = {
  [Property in keyof MemberFormData]: FormControl<MemberFormData[Property]>;
};

export interface MemberWithNewRatings extends Member {
  newRating: string;
  newPeakRating: string;
}
