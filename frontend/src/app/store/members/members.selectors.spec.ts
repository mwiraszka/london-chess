import { pick } from 'lodash';
import moment from 'moment-timezone';

import { INITIAL_MEMBER_FORM_DATA, MEMBER_FORM_DATA_PROPERTIES } from '@app/constants';
import { MOCK_MEMBERS } from '@app/mocks/members.mock';
import { DataPaginationOptions, Member, MemberFormData } from '@app/models';

import { MembersState, membersAdapter } from './members.reducer';
import * as MembersSelectors from './members.selectors';

describe('Members Selectors', () => {
  const mockOptions: DataPaginationOptions<Member> = {
    page: 1,
    pageSize: 10,
    sortBy: 'lastName',
    sortOrder: 'asc',
    filters: {
      showInactiveMembers: {
        label: 'Show inactive members',
        value: false,
      },
    },
    search: '',
  };

  const mockMemberFormData: MemberFormData = {
    firstName: 'Test',
    lastName: 'User',
    email: 'test@example.com',
    phoneNumber: '555-1234',
    city: 'London',
    rating: '1500',
    peakRating: '1600',
    yearOfBirth: '1990',
    dateJoined: moment('2020-01-01').toISOString(),
    isActive: true,
    chessComUsername: 'testuser',
    lichessUsername: 'testuser',
  };

  const mockMembersState: MembersState = {
    ...membersAdapter.getInitialState({
      failedLoads: [],
      newMemberFormData: INITIAL_MEMBER_FORM_DATA,
      recordsScope: 'admin',
      lastFullFetch: '2025-01-15T10:00:00.000Z',
      lastFilteredFetch: '2025-01-14T12:00:00.000Z',
      filteredMembers: [MOCK_MEMBERS[0], MOCK_MEMBERS[1]],
      options: mockOptions,
      filteredCount: 8,
      totalCount: 15,
    }),
    entities: {
      [MOCK_MEMBERS[0].id]: {
        member: MOCK_MEMBERS[0],
        formData: mockMemberFormData,
      },
      [MOCK_MEMBERS[1].id]: {
        member: MOCK_MEMBERS[1],
        formData: null,
      },
    },
    ids: [MOCK_MEMBERS[0].id, MOCK_MEMBERS[1].id],
  };

  describe('selectFilteredMembersStatus', () => {
    it('should be loading until the first results arrive', () => {
      const result = MembersSelectors.selectFilteredMembersStatus.projector(null, [
        'member',
      ]);

      expect(result).toBe('loading');
    });

    it('should be failed when the first results could not be loaded', () => {
      const result = MembersSelectors.selectFilteredMembersStatus.projector(null, [
        'filtered',
      ]);

      expect(result).toBe('failed');
    });

    it('should stay loaded when a later refresh fails', () => {
      const result = MembersSelectors.selectFilteredMembersStatus.projector(
        '2025-01-15T10:00:00.000Z',
        ['filtered'],
      );

      expect(result).toBe('loaded');
    });
  });

  describe('selectMemberProfileStatus', () => {
    it('should be loaded once the member is stored', () => {
      const selector = MembersSelectors.selectMemberProfileStatus(0);

      const result = selector.projector(MOCK_MEMBERS[0], ['member']);

      expect(result).toBe('loaded');
    });

    it('should be failed when the member could not be loaded', () => {
      const selector = MembersSelectors.selectMemberProfileStatus(0);

      const result = selector.projector(null, ['member']);

      expect(result).toBe('failed');
    });
  });

  describe('selectEditableMemberStatus', () => {
    it('should be loaded once the admin record is stored', () => {
      const selector = MembersSelectors.selectEditableMemberStatus(MOCK_MEMBERS[0].id);

      const result = selector.projector(MOCK_MEMBERS[0], 'admin', []);

      expect(result).toBe('loaded');
    });

    it('should keep loading while only a public record is stored', () => {
      const selector = MembersSelectors.selectEditableMemberStatus(MOCK_MEMBERS[0].id);

      const result = selector.projector(MOCK_MEMBERS[0], 'public', []);

      expect(result).toBe('loading');
    });

    it('should be failed when the admin record could not be loaded', () => {
      const selector = MembersSelectors.selectEditableMemberStatus(MOCK_MEMBERS[0].id);

      const result = selector.projector(null, 'public', ['member']);

      expect(result).toBe('failed');
    });
  });

  describe('selectRecordsScope', () => {
    it('should select the scope the stored records came from', () => {
      const result = MembersSelectors.selectRecordsScope.projector(mockMembersState);
      expect(result).toBe('admin');
    });
  });

  describe('selectLastFullFetch', () => {
    it('should select the last full fetch timestamp', () => {
      const result = MembersSelectors.selectLastFullFetch.projector(mockMembersState);
      expect(result).toBe('2025-01-15T10:00:00.000Z');
    });
  });

  describe('selectLastFilteredFetch', () => {
    it('should select the last filtered fetch timestamp', () => {
      const result = MembersSelectors.selectLastFilteredFetch.projector(mockMembersState);
      expect(result).toBe('2025-01-14T12:00:00.000Z');
    });
  });

  describe('selectFilteredMembers', () => {
    it('should select the filtered members', () => {
      const result = MembersSelectors.selectFilteredMembers.projector(mockMembersState);
      expect(result).toEqual([MOCK_MEMBERS[0], MOCK_MEMBERS[1]]);
    });
  });

  describe('selectOptions', () => {
    it('should select the data pagination options', () => {
      const result = MembersSelectors.selectOptions.projector(mockMembersState);
      expect(result).toEqual(mockOptions);
    });
  });

  describe('selectFilteredCount', () => {
    it('should select the filtered count', () => {
      const result = MembersSelectors.selectFilteredCount.projector(mockMembersState);
      expect(result).toBe(8);
    });
  });

  describe('selectTotalCount', () => {
    it('should select the total count', () => {
      const result = MembersSelectors.selectTotalCount.projector(mockMembersState);
      expect(result).toBe(15);
    });
  });

  describe('selectAllMembers', () => {
    it('should select all members from entities', () => {
      const allMemberEntities = [
        { member: MOCK_MEMBERS[0], formData: mockMemberFormData },
        { member: MOCK_MEMBERS[1], formData: null },
      ];
      const result = MembersSelectors.selectAllMembers.projector(allMemberEntities);
      expect(result).toEqual([MOCK_MEMBERS[0], MOCK_MEMBERS[1]]);
    });
  });

  describe('selectMemberById', () => {
    it('should select member by id when it exists', () => {
      const allMembers = [MOCK_MEMBERS[0], MOCK_MEMBERS[1]];
      const selector = MembersSelectors.selectMemberById(MOCK_MEMBERS[1].id);
      const result = selector.projector(allMembers);
      expect(result).toEqual(MOCK_MEMBERS[1]);
    });

    it('should return null when member id does not exist', () => {
      const allMembers = [MOCK_MEMBERS[0]];
      const selector = MembersSelectors.selectMemberById('non-existent-id');
      const result = selector.projector(allMembers);
      expect(result).toBeNull();
    });

    it('should return null when id is null', () => {
      const allMembers = [MOCK_MEMBERS[0]];
      const selector = MembersSelectors.selectMemberById(null);
      const result = selector.projector(allMembers);
      expect(result).toBeNull();
    });
  });

  describe('selectMemberFormDataById', () => {
    it('should select form data for existing member', () => {
      const allMemberEntities = [
        { member: MOCK_MEMBERS[1], formData: mockMemberFormData },
      ];
      const selector = MembersSelectors.selectMemberFormDataById(MOCK_MEMBERS[1].id);
      const result = selector.projector(mockMembersState, allMemberEntities);
      expect(result).toEqual(mockMemberFormData);
    });

    it('should use the member record when there is no draft', () => {
      const allMemberEntities = [{ member: MOCK_MEMBERS[1], formData: null }];
      const selector = MembersSelectors.selectMemberFormDataById(MOCK_MEMBERS[1].id);

      const result = selector.projector(mockMembersState, allMemberEntities);

      expect(result).toEqual(pick(MOCK_MEMBERS[1], MEMBER_FORM_DATA_PROPERTIES));
    });

    it("should keep an account holder's email from the member rather than the draft", () => {
      const member: Member = { ...MOCK_MEMBERS[0], email: 'account@example.com' };
      const allMemberEntities = [
        { member, formData: { ...mockMemberFormData, email: '' } },
      ];
      const selector = MembersSelectors.selectMemberFormDataById(member.id);

      const result = selector.projector(mockMembersState, allMemberEntities);

      expect(result).toEqual({ ...mockMemberFormData, email: 'account@example.com' });
    });

    it('should return newMemberFormData when member id is null', () => {
      const allMemberEntities = [
        { member: MOCK_MEMBERS[0], formData: mockMemberFormData },
      ];
      const selector = MembersSelectors.selectMemberFormDataById(null);
      const result = selector.projector(mockMembersState, allMemberEntities);
      expect(result).toEqual(INITIAL_MEMBER_FORM_DATA);
    });
  });

  describe('selectHasUnsavedChanges', () => {
    it('should return false when member and form data are the same', () => {
      const member: Member = MOCK_MEMBERS[0];
      const formData: MemberFormData = {
        firstName: member.firstName,
        lastName: member.lastName,
        email: member.email,
        phoneNumber: member.phoneNumber,
        city: member.city,
        rating: member.rating,
        peakRating: member.peakRating,
        yearOfBirth: member.yearOfBirth,
        dateJoined: member.dateJoined,
        isActive: member.isActive,
        chessComUsername: member.chessComUsername,
        lichessUsername: member.lichessUsername,
      };
      const selector = MembersSelectors.selectHasUnsavedChanges(member.id);
      const result = selector.projector(member, formData);
      expect(result).toBe(false);
    });

    it('should return true when firstName has changed', () => {
      const member: Member = {
        ...MOCK_MEMBERS[0],
        firstName: 'Original',
        dateJoined: '2020-01-01T00:00:00.000Z',
      };
      const formData: MemberFormData = {
        ...mockMemberFormData,
        firstName: 'Modified',
        dateJoined: '2020-01-01T00:00:00.000Z',
      };
      const selector = MembersSelectors.selectHasUnsavedChanges(member.id);
      const result = selector.projector(member, formData);
      expect(result).toBe(true);
    });

    it('should return false when only time portion of dateJoined differs', () => {
      const member: Member = {
        ...MOCK_MEMBERS[0],
        dateJoined: '2020-01-01T10:30:00.000Z',
      };
      const formData: MemberFormData = {
        firstName: member.firstName,
        lastName: member.lastName,
        email: member.email,
        phoneNumber: member.phoneNumber,
        city: member.city,
        rating: member.rating,
        peakRating: member.peakRating,
        yearOfBirth: member.yearOfBirth,
        dateJoined: '2020-01-01T18:45:00.000Z',
        isActive: member.isActive,
        chessComUsername: member.chessComUsername,
        lichessUsername: member.lichessUsername,
      };
      const selector = MembersSelectors.selectHasUnsavedChanges(member.id);
      const result = selector.projector(member, formData);
      expect(result).toBe(false);
    });

    it('should return true when day portion of dateJoined differs', () => {
      const member: Member = {
        ...MOCK_MEMBERS[0],
        dateJoined: '2020-01-01T00:00:00.000Z',
      };
      const formData: MemberFormData = {
        ...mockMemberFormData,
        firstName: member.firstName,
        lastName: member.lastName,
        dateJoined: '2020-01-02T00:00:00.000Z',
      };
      const selector = MembersSelectors.selectHasUnsavedChanges(member.id);
      const result = selector.projector(member, formData);
      expect(result).toBe(true);
    });
  });
});
