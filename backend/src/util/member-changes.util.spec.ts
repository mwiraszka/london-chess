import { EditableMemberFields } from '../models/member.model';
import { describeMemberChanges, isRatingChangeOnly } from './member-changes.util';

const DETAILS: Omit<EditableMemberFields, 'modificationInfo'> = {
  firstName: 'Jane',
  lastName: 'Doe',
  city: 'London',
  rating: '1500',
  peakRating: '1600',
  dateJoined: '2022-08-18T04:00:00.000Z',
  email: 'jane@example.com',
  phoneNumber: '',
  yearOfBirth: '1990',
  chessComUsername: 'janedoe',
  lichessUsername: '',
  isActive: true,
};

describe('describeMemberChanges', () => {
  it('should list only the fields that changed, in the order the editor shows them', () => {
    const changes = describeMemberChanges(DETAILS, {
      ...DETAILS,
      rating: '1550',
      city: 'Toronto',
    });

    expect(changes).toEqual([
      { field: 'city', label: 'City', before: 'London', after: 'Toronto' },
      { field: 'rating', label: 'Rating', before: '1500', after: '1550' },
    ]);
  });

  it('should show empty values as None and active status as Yes or No', () => {
    const changes = describeMemberChanges(DETAILS, {
      ...DETAILS,
      phoneNumber: '519-555-0100',
      isActive: false,
    });

    expect(changes).toEqual([
      {
        field: 'phoneNumber',
        label: 'Phone number',
        before: 'None',
        after: '519-555-0100',
      },
      { field: 'isActive', label: 'Active member', before: 'Yes', after: 'No' },
    ]);
  });

  it('should read a field missing from an older record as empty', () => {
    const olderRecord = { ...DETAILS, lichessUsername: undefined };

    const changes = describeMemberChanges(olderRecord, DETAILS);

    expect(changes).toEqual([]);
  });

  it('should treat a join date later on the same day as unchanged', () => {
    const changes = describeMemberChanges(DETAILS, {
      ...DETAILS,
      dateJoined: '2022-08-18T16:30:00.000Z',
    });

    expect(changes).toEqual([]);
  });

  it('should show a changed join date as a readable date', () => {
    const changes = describeMemberChanges(DETAILS, {
      ...DETAILS,
      dateJoined: '2019-01-01T05:00:00.000Z',
    });

    expect(changes).toEqual([
      {
        field: 'dateJoined',
        label: 'Date joined',
        before: 'August 18, 2022',
        after: 'January 1, 2019',
      },
    ]);
  });

  it('should compare only the given fields', () => {
    const changes = describeMemberChanges(
      DETAILS,
      { ...DETAILS, rating: '1550', city: 'Toronto' },
      ['rating', 'peakRating'],
    );

    expect(changes.map(change => change.field)).toEqual(['rating']);
  });
});

describe('isRatingChangeOnly', () => {
  it('should be true only when every change is to a rating', () => {
    const ratingChanges = describeMemberChanges(DETAILS, {
      ...DETAILS,
      rating: '1550',
      peakRating: '1650',
    });
    const mixedChanges = describeMemberChanges(DETAILS, {
      ...DETAILS,
      rating: '1550',
      city: 'Toronto',
    });

    expect(isRatingChangeOnly(ratingChanges)).toBe(true);
    expect(isRatingChangeOnly(mixedChanges)).toBe(false);
  });
});
