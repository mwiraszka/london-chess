import { FormControl } from '@angular/forms';

import { MEMBER_FORM_DATA_PROPERTIES } from '@app/constants';

import { Id, IsoDate, Url } from './core.model';
import { ExternalRatings } from './external-rating.model';
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
  fideId: string;
  cfcId: string;
  isActive: boolean;
  isAdmin?: boolean;
  dateJoined: IsoDate;
  // Sent only with a profile page lookup or to admins
  yearJoined?: string;
  showYearOfBirth?: boolean;
  modificationInfo: ModificationInfo;
  avatarUrl: Url | null;
  // Only admins learn whether a member has an account, and when it was opened
  hasAccount?: boolean;
  accountOpened?: IsoDate | null;
}

// A profile page lookup also brings the member's ratings on other chess sites
export type MemberProfileRecord = Member & { externalRatings: ExternalRatings };

// The number, avatar and account belong to the server, so admins never write them
export type EditableMember = MemberFormData & Pick<Member, 'modificationInfo'>;

export type NameOrder = 'first-last' | 'last-first';

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

export interface FederationIdsFormData {
  fideId: string;
  cfcId: string;
}

export type FederationIdsFormGroup = {
  [Property in keyof FederationIdsFormData]: FormControl<FederationIdsFormData[Property]>;
};

export type ProfileDetailsFormData = MemberDetailsFormData & FederationIdsFormData;

// The details a member may leave empty, which they can remove without an admin
export type OptionalDetail =
  'phoneNumber' | 'lichessUsername' | 'chessComUsername' | 'fideId' | 'cfcId';

export interface DetailsChangeResult {
  removed: OptionalDetail[];
  // Waiting for an admin to make them
  requested: (keyof ProfileDetailsFormData)[];
}

export type MemberFormData = Pick<Member, (typeof MEMBER_FORM_DATA_PROPERTIES)[number]>;

// The day joined is picked as a day and saved as an instant
export type MemberFormGroup = {
  [Property in Exclude<keyof MemberFormData, 'dateJoined'>]: FormControl<
    MemberFormData[Property]
  >;
} & {
  dateJoined: FormControl<Date | null>;
};

export type MemberFormValue = Omit<MemberFormData, 'dateJoined'> & {
  dateJoined: Date | null;
};

export interface MemberWithNewRatings extends Member {
  newRating: string;
  newPeakRating: string;
}
