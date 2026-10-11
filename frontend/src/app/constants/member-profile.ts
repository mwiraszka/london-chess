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

// Club ratings top out near 2200, so the rating chart never needs to reach past this
export const RATING_AXIS_CEILING = 2500;

// Wider gaps would leave the rating chart with too few lines to read a rating against
export const RATING_AXIS_MAX_STEP = 500;
