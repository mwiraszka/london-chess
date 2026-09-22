import { pick } from 'lodash';

import { INITIAL_MEMBER_FORM_DATA, MEMBER_FORM_DATA_PROPERTIES } from '@app/constants';
import { MOCK_MEMBERS } from '@app/mocks/members.mock';
import { LccError, Member, MemberFormData } from '@app/models';

import * as MembersActions from './members.actions';
import {
  MemberEntity,
  MembersState,
  initialState,
  memberFormDataOf,
  membersAdapter,
  membersReducer,
} from './members.reducer';

describe('Members Reducer', () => {
  const mockMember = MOCK_MEMBERS[0];
  const otherMember = MOCK_MEMBERS[1];
  // The public API leaves out a member's private details
  const publicOtherMember: Member = {
    ...otherMember,
    email: '',
    phoneNumber: '',
    yearOfBirth: '',
  };

  function adminStateWith(entity: MemberEntity): MembersState {
    return membersAdapter.setAll([entity], { ...initialState, recordsScope: 'admin' });
  }

  function formDataIn(state: MembersState, id: string): MemberFormData | undefined {
    const entity = state.entities[id];
    return entity && memberFormDataOf(entity);
  }
  const mockError: LccError = {
    name: 'LCCError',
    message: 'Something went wrong',
  };

  describe('unknown action', () => {
    it('should return the default state', () => {
      const action = { type: 'Unknown' };
      const state = membersReducer(initialState, action);

      expect(state).toBe(initialState);
    });
  });

  describe('initialState', () => {
    it('should have the correct initial state', () => {
      expect(initialState).toEqual({
        ids: [],
        entities: {},
        newMemberFormData: INITIAL_MEMBER_FORM_DATA,
        failedLoads: [],
        isFetchingFiltered: false,
        recordsScope: null,
        lastFullFetch: null,
        lastFilteredFetch: null,
        filteredMembers: [],
        options: {
          page: 1,
          pageSize: 20,
          sortBy: 'rating',
          sortOrder: 'desc',
          filters: {
            showInactiveMembers: {
              label: 'Show inactive members',
              value: false,
            },
          },
          search: '',
        },
        filteredCount: null,
        totalCount: 0,
      });
    });
  });

  describe('failed loads', () => {
    it('should record each load whose request fails', () => {
      const actions = [
        MembersActions.fetchFilteredMembersFailed({ error: mockError }),
        MembersActions.fetchMemberFailed({ error: mockError }),
      ];

      const state = actions.reduce(membersReducer, initialState);

      expect(state.failedLoads).toEqual(['filtered', 'member']);
    });

    it('should forget a member failure when a profile or editor asks for it again', () => {
      const failedState: MembersState = { ...initialState, failedLoads: ['member'] };

      const byNumber = membersReducer(
        failedState,
        MembersActions.fetchMemberByNumberRequested({ memberNumber: 7 }),
      );
      const byId = membersReducer(
        failedState,
        MembersActions.fetchMemberRequested({ memberId: mockMember.id }),
      );

      expect(byNumber.failedLoads).toEqual([]);
      expect(byId.failedLoads).toEqual([]);
    });

    it('should leave loads untouched when a change or full fetch fails', () => {
      const actions = [
        MembersActions.fetchAllMembersFailed({ error: mockError }),
        MembersActions.addMemberFailed({ error: mockError }),
        MembersActions.updateMemberFailed({ error: mockError }),
        MembersActions.deleteMemberFailed({ error: mockError }),
        MembersActions.updateMemberRatingsFailed({ error: mockError }),
      ];

      const state = actions.reduce(membersReducer, initialState);

      expect(state).toEqual(initialState);
    });
  });

  describe('fetchAllMembersSucceeded', () => {
    it('should set all members in state along with the scope they came from', () => {
      const members = [mockMember];
      const action = MembersActions.fetchAllMembersSucceeded({
        members,
        totalCount: 1,
        scope: 'admin',
      });

      const state = membersReducer(initialState, action);

      expect(state.ids.length).toBe(1);
      expect(state.entities[mockMember.id]?.member).toEqual(mockMember);
      expect(state.entities[mockMember.id]?.formData).toBeNull();
      expect(state.recordsScope).toBe('admin');
      expect(state.totalCount).toBe(1);
      expect(state.lastFullFetch).toBeTruthy();
    });

    it('should keep a draft that holds edits', () => {
      const draft = {
        ...pick(otherMember, MEMBER_FORM_DATA_PROPERTIES),
        firstName: 'Modified',
      };
      const previousState = adminStateWith({ member: otherMember, formData: draft });
      const action = MembersActions.fetchAllMembersSucceeded({
        members: [{ ...otherMember, firstName: 'Updated' }],
        totalCount: 1,
        scope: 'admin',
      });

      const state = membersReducer(previousState, action);

      expect(state.entities[otherMember.id]?.formData).toEqual(draft);
    });

    it('should drop a draft that holds no edits', () => {
      const previousState = adminStateWith({
        member: otherMember,
        formData: pick(otherMember, MEMBER_FORM_DATA_PROPERTIES),
      });
      const action = MembersActions.fetchAllMembersSucceeded({
        members: [{ ...otherMember, city: 'Toronto' }],
        totalCount: 1,
        scope: 'admin',
      });

      const state = membersReducer(previousState, action);

      expect(state.entities[otherMember.id]?.formData).toBeNull();
      expect(formDataIn(state, otherMember.id)?.city).toBe('Toronto');
    });

    it('should replace public records and the page shown with admin records', () => {
      const previousState: MembersState = {
        ...membersAdapter.setAll(
          [
            {
              member: publicOtherMember,
              formData: pick(publicOtherMember, MEMBER_FORM_DATA_PROPERTIES),
            },
          ],
          initialState,
        ),
        recordsScope: 'public',
        filteredMembers: [publicOtherMember],
      };
      const action = MembersActions.fetchAllMembersSucceeded({
        members: [otherMember],
        totalCount: 1,
        scope: 'admin',
      });

      const state = membersReducer(previousState, action);

      expect(state.recordsScope).toBe('admin');
      expect(state.entities[otherMember.id]).toEqual({
        member: otherMember,
        formData: null,
      });
      expect(state.filteredMembers).toEqual([otherMember]);
      expect(formDataIn(state, otherMember.id)?.yearOfBirth).toBe(
        otherMember.yearOfBirth,
      );
    });
  });

  describe('fetchFilteredMembersSucceeded', () => {
    it('should add members to state and update filteredMembers', () => {
      const members = [mockMember];
      const action = MembersActions.fetchFilteredMembersSucceeded({
        members,
        filteredCount: 1,
        totalCount: 1,
        scope: 'public',
      });

      const state = membersReducer(initialState, action);

      expect(state.ids.length).toBe(1);
      expect(state.recordsScope).toBe('public');
      expect(state.filteredMembers).toEqual(members);
      expect(state.filteredCount).toBe(1);
      expect(state.totalCount).toBe(1);
      expect(state.lastFilteredFetch).toBeTruthy();
    });

    it('should drop records from the other scope', () => {
      const previousState: MembersState = {
        ...membersAdapter.setAll(
          [{ member: publicOtherMember, formData: null }],
          initialState,
        ),
        recordsScope: 'public',
        lastFullFetch: '2025-01-01T00:00:00.000Z',
      };
      const action = MembersActions.fetchFilteredMembersSucceeded({
        members: [mockMember],
        filteredCount: 1,
        totalCount: 2,
        scope: 'admin',
      });

      const state = membersReducer(previousState, action);

      expect(state.recordsScope).toBe('admin');
      expect(state.ids).toEqual([mockMember.id]);
      expect(state.lastFullFetch).toBeNull();
    });
  });

  describe('paginationOptionsChanged', () => {
    it('should update pagination options', () => {
      const newOptions = {
        ...initialState.options,
        page: 2,
      };

      const action = MembersActions.paginationOptionsChanged({
        options: newOptions,
        fetch: false,
      });
      const state = membersReducer(initialState, action);

      expect(state.options.page).toBe(2);
    });

    it('should keep the shown page loaded until the next one arrives', () => {
      const previousState: MembersState = {
        ...initialState,
        lastFilteredFetch: '2025-01-01T00:00:00.000Z',
      };
      const action = MembersActions.paginationOptionsChanged({
        options: { ...initialState.options, page: 2 },
        fetch: true,
      });

      const state = membersReducer(previousState, action);

      expect(state.lastFilteredFetch).toBe('2025-01-01T00:00:00.000Z');
    });
  });

  describe('fetchMemberSucceeded', () => {
    it('should add member to state', () => {
      const action = MembersActions.fetchMemberSucceeded({
        member: mockMember,
        scope: 'admin',
      });

      const state = membersReducer(initialState, action);

      expect(state.entities[mockMember.id]).toEqual({
        member: mockMember,
        formData: null,
      });
      expect(state.recordsScope).toBe('admin');
    });

    it('should keep a draft that holds edits', () => {
      const draft = {
        ...pick(otherMember, MEMBER_FORM_DATA_PROPERTIES),
        city: 'Toronto',
      };
      const previousState = adminStateWith({ member: otherMember, formData: draft });
      const action = MembersActions.fetchMemberSucceeded({
        member: otherMember,
        scope: 'admin',
      });

      const state = membersReducer(previousState, action);

      expect(state.entities[otherMember.id]?.formData).toEqual(draft);
    });

    it('should build form data from the admin record once public records are replaced', () => {
      const publicState = membersReducer(
        initialState,
        MembersActions.fetchFilteredMembersSucceeded({
          members: [publicOtherMember, mockMember],
          filteredCount: 2,
          totalCount: 2,
          scope: 'public',
        }),
      );
      const action = MembersActions.fetchMemberSucceeded({
        member: otherMember,
        scope: 'admin',
      });

      const state = membersReducer(publicState, action);

      expect(state.recordsScope).toBe('admin');
      expect(state.ids).toEqual([otherMember.id]);
      expect(state.filteredMembers).toEqual([]);
      expect(state.lastFilteredFetch).toBeNull();
      expect(formDataIn(state, otherMember.id)).toEqual(
        pick(otherMember, MEMBER_FORM_DATA_PROPERTIES),
      );
    });
  });

  describe('addMemberSucceeded', () => {
    it('should add new member to state', () => {
      const action = MembersActions.addMemberSucceeded({
        member: mockMember,
        emailSent: null,
      });
      const state = membersReducer(initialState, action);

      expect(state.entities['a1b2c3d4e5f6a7b8']).toEqual({
        member: mockMember,
        formData: null,
      });
      expect(state.newMemberFormData).toEqual(INITIAL_MEMBER_FORM_DATA);
    });
  });

  describe('updateMemberSucceeded', () => {
    it('should update existing member and clear its draft', () => {
      const previousState = adminStateWith({
        member: mockMember,
        formData: {
          ...pick(mockMember, MEMBER_FORM_DATA_PROPERTIES),
          rating: '1600/15',
        },
      });

      const updatedMember = { ...mockMember, rating: '1600/15' };
      const action = MembersActions.updateMemberSucceeded({
        member: updatedMember,
        originalMemberName: 'John Doe',
        emailSent: null,
      });
      const state = membersReducer(previousState, action);

      expect(state.entities['a1b2c3d4e5f6a7b8']).toEqual({
        member: updatedMember,
        formData: null,
      });
    });

    it('should show the saved member in the page shown straight away', () => {
      const updatedMember = { ...mockMember, rating: '1600/15' };
      const previousState: MembersState = {
        ...adminStateWith({ member: mockMember, formData: null }),
        filteredMembers: [mockMember, otherMember],
        lastFilteredFetch: '2025-01-01T00:00:00.000Z',
      };
      const action = MembersActions.updateMemberSucceeded({
        member: updatedMember,
        originalMemberName: 'John Doe',
        emailSent: null,
      });

      const state = membersReducer(previousState, action);

      expect(state.filteredMembers).toEqual([updatedMember, otherMember]);
      expect(state.lastFilteredFetch).toBe('2025-01-01T00:00:00.000Z');
    });
  });

  describe('updateMemberRatingsSucceeded', () => {
    it('should update multiple members ratings', () => {
      const member1 = { ...MOCK_MEMBERS[0], rating: '1500/10' };
      const member2 = { ...MOCK_MEMBERS[1], rating: '1400/8' };

      const previousState: MembersState = membersAdapter.setAll(
        [
          { member: member1, formData: null },
          { member: member2, formData: null },
        ],
        initialState,
      );

      const updatedMember1 = { ...member1, rating: '1550/15' };
      const updatedMember2 = { ...member2, rating: '1450/13' };

      const action = MembersActions.updateMemberRatingsSucceeded({
        members: [updatedMember1, updatedMember2],
        unnotifiedMemberNames: [],
      });
      const state = membersReducer(previousState, action);

      expect(state.entities['a1b2c3d4e5f6a7b8']?.member.rating).toBe('1550/15');
      expect(state.entities['b2c3d4e5f6a7b8c9']?.member.rating).toBe('1450/13');
    });

    it('should show the new ratings in the page shown straight away', () => {
      const updatedMember = { ...otherMember, rating: '1450/13' };
      const previousState: MembersState = {
        ...initialState,
        filteredMembers: [mockMember, otherMember],
      };
      const action = MembersActions.updateMemberRatingsSucceeded({
        members: [updatedMember],
        unnotifiedMemberNames: [],
      });

      const state = membersReducer(previousState, action);

      expect(state.filteredMembers).toEqual([mockMember, updatedMember]);
    });
  });

  describe('deleteMemberSucceeded', () => {
    it('should remove member from state', () => {
      const previousState: MembersState = membersAdapter.upsertOne(
        { member: mockMember, formData: null },
        initialState,
      );

      const action = MembersActions.deleteMemberSucceeded({
        memberId: MOCK_MEMBERS[0].id,
        memberName: 'John Doe',
      });
      const state = membersReducer(previousState, action);

      expect(state.entities['a1b2c3d4e5f6a7b8']).toBeUndefined();
      expect(state.ids.length).toBe(0);
    });

    it('should take the member off the page shown without reloading it', () => {
      const previousState: MembersState = {
        ...initialState,
        filteredMembers: [mockMember, otherMember],
        lastFilteredFetch: '2025-01-01T00:00:00.000Z',
      };
      const action = MembersActions.deleteMemberSucceeded({
        memberId: mockMember.id,
        memberName: 'John Doe',
      });

      const state = membersReducer(previousState, action);

      expect(state.filteredMembers).toEqual([otherMember]);
      expect(state.lastFilteredFetch).toBe('2025-01-01T00:00:00.000Z');
    });
  });

  describe('formDataChanged', () => {
    it('should update newMemberFormData when memberId is null', () => {
      const formData = { firstName: 'New Name' };
      const action = MembersActions.formDataChanged({ memberId: null, formData });
      const state = membersReducer(initialState, action);

      expect(state.newMemberFormData.firstName).toBe('New Name');
    });

    it('should start a draft from the member record', () => {
      const previousState = adminStateWith({ member: mockMember, formData: null });
      const action = MembersActions.formDataChanged({
        memberId: mockMember.id,
        formData: { firstName: 'Modified' },
      });

      const state = membersReducer(previousState, action);

      expect(state.entities[mockMember.id]?.formData).toEqual({
        ...pick(mockMember, MEMBER_FORM_DATA_PROPERTIES),
        firstName: 'Modified',
      });
    });

    it('should update an existing draft', () => {
      const previousState = adminStateWith({
        member: mockMember,
        formData: { ...pick(mockMember, MEMBER_FORM_DATA_PROPERTIES), city: 'Toronto' },
      });
      const action = MembersActions.formDataChanged({
        memberId: mockMember.id,
        formData: { firstName: 'Modified' },
      });

      const state = membersReducer(previousState, action);

      expect(state.entities[mockMember.id]?.formData).toEqual({
        ...pick(mockMember, MEMBER_FORM_DATA_PROPERTIES),
        city: 'Toronto',
        firstName: 'Modified',
      });
    });
  });

  describe('formDataRestored', () => {
    it('should reset newMemberFormData when memberId is null', () => {
      const previousState: MembersState = {
        ...initialState,
        newMemberFormData: {
          ...INITIAL_MEMBER_FORM_DATA,
          firstName: 'Draft',
        },
      };

      const action = MembersActions.formDataRestored({ memberId: null });
      const state = membersReducer(previousState, action);

      expect(state.newMemberFormData).toEqual(INITIAL_MEMBER_FORM_DATA);
    });

    it('should discard the member draft', () => {
      const previousState: MembersState = membersAdapter.upsertOne(
        {
          member: mockMember,
          formData: {
            ...INITIAL_MEMBER_FORM_DATA,
            firstName: 'Modified',
          },
        },
        initialState,
      );

      const action = MembersActions.formDataRestored({ memberId: MOCK_MEMBERS[0].id });
      const state = membersReducer(previousState, action);

      expect(state.entities['a1b2c3d4e5f6a7b8']?.formData).toBeNull();
    });
  });

  describe('state immutability', () => {
    it('should not mutate the previous state', () => {
      const previousState: MembersState = { ...initialState };
      const originalState = { ...previousState };

      const action = MembersActions.fetchFilteredMembersRequested();
      const state = membersReducer(previousState, action);

      expect(previousState).toEqual(originalState);
      expect(state).not.toBe(previousState);
    });
  });
  describe('a fetch of filtered members', () => {
    it('should be marked as under way until it succeeds or fails', () => {
      const fetching = membersReducer(
        initialState,
        MembersActions.fetchFilteredMembersRequested(),
      );

      expect(fetching.isFetchingFiltered).toBe(true);
      expect(
        membersReducer(
          fetching,
          MembersActions.fetchFilteredMembersFailed({ error: mockError }),
        ).isFetchingFiltered,
      ).toBe(false);
    });
  });
});
