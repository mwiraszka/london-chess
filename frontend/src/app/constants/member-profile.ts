import { Member } from '@app/models';

// Shaped like a typical profile, so a loading skeleton sized by it matches the real card
export const PLACEHOLDER_PROFILE_MEMBER: Member = {
  id: '',
  number: null,
  firstName: 'First',
  lastName: 'Last',
  rating: '1500',
  peakRating: '1500',
  email: '',
  phoneNumber: '',
  city: 'London',
  yearOfBirth: '',
  showYearOfBirth: false,
  chessComUsername: 'username',
  lichessUsername: 'username',
  isActive: true,
  isAdmin: false,
  dateJoined: '',
  yearJoined: '2020',
  modificationInfo: {
    dateCreated: '',
    createdBy: '',
    createdByNumber: null,
    dateLastEdited: '',
    lastEditedBy: '',
    lastEditedByNumber: null,
  },
  avatarUrl: null,
};
