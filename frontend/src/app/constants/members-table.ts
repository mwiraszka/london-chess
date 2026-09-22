import { Member } from '@app/models';

import { PLACEHOLDER_PROFILE_MEMBER } from './member-profile';

export const MEMBERS_PAGE_SIZES = [10, 20, 50, 100];

// The widest values the members table shows, so its columns are sized before any
// member is fetched
export const WIDEST_MEMBER: Member = {
  ...PLACEHOLDER_PROFILE_MEMBER,
  firstName: 'Thamaraiselvan',
  lastName: 'Viralam Lakshminarasimha',
  rating: '2307/7',
  peakRating: '2307/7',
  email: 'thamaraiselvan.dhandapani@gmail.com',
  phoneNumber: '+1 (519) 555-0199',
  city: 'Niagara-on-the-Lake',
  yearOfBirth: '2000',
  chessComUsername: 'thamaraiselvan_chess',
  lichessUsername: 'thamaraiselvan_chess',
  dateJoined: '2000-09-30T00:00:00.000Z',
  modificationInfo: {
    ...PLACEHOLDER_PROFILE_MEMBER.modificationInfo,
    dateLastEdited: '2000-09-30T00:00:00.000Z',
  },
};

export const WIDEST_ROW_NUMBER = 999;
