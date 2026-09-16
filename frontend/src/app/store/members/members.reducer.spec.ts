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
        callState: {
          status: 'idle',
          error: null,
          loadStart: null,
        },
        newMemberFormData: INITIAL_MEMBER_FORM_DATA,
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

  describe('loading states', () => {
    it('should set loading state on fetchAllMembersRequested', () => {
      const action = MembersActions.fetchAllMembersRequested();
      const state = membersReducer(initialState, action);

      expect(state.callState.status).toBe('loading');
      expect(state.callState.loadStart).toBeTruthy();
    });

    it('should set loading state on fetchFilteredMembersRequested', () => {
      const action = MembersActions.fetchFilteredMembersRequested();
      const state = membersReducer(initialState, action);

      expect(state.callState.status).toBe('loading');
    });

    it('should set loading state on fetchMemberRequested', () => {
      const action = MembersActions.fetchMemberRequested({
        memberId: MOCK_MEMBERS[0].id,
      });
      const state = membersReducer(initialState, action);

      expect(state.callState.status).toBe('loading');
    });

    it('should set loading state on addMemberRequested', () => {
      const action = MembersActions.addMemberRequested({ notifyMember: false });
      const state = membersReducer(initialState, action);

      expect(state.callState.status).toBe('loading');
    });

    it('should set loading state on updateMemberRequested', () => {
      const action = MembersActions.updateMemberRequested({
        memberId: MOCK_MEMBERS[0].id,
        notifyMember: false,
      });
      const state = membersReducer(initialState, action);

      expect(state.callState.status).toBe('loading');
    });

    it('should set loading state on deleteMemberRequested', () => {
      const action = MembersActions.deleteMemberRequested({ member: mockMember });
      const state = membersReducer(initialState, action);

      expect(state.callState.status).toBe('loading');
    });

    it('should set loading state on updateMemberRatingsRequested', () => {
      const action = MembersActions.updateMemberRatingsRequested({
        membersWithNewRatings: [
          {
            ...mockMember,
            newRating: '1600/15',
            newPeakRating: '1600',
          },
        ],
      });
      const state = membersReducer(initialState, action);

      expect(state.callState.status).toBe('loading');
    });
  });

  describe('background loading states', () => {
    it('should set background-loading state on fetchFilteredMembersInBackgroundRequested', () => {
      const action = MembersActions.fetchFilteredMembersInBackgroundRequested();
      const state = membersReducer(initialState, action);

      expect(state.callState.status).toBe('background-loading');
      expect(state.callState.loadStart).toBeTruthy();
    });
  });

  describe('error states', () => {
    it('should set error state on fetchAllMembersFailed', () => {
      const action = MembersActions.fetchAllMembersFailed({ error: mockError });
      const state = membersReducer(initialState, action);

      expect(state.callState.status).toBe('error');
      expect(state.callState.error).toEqual(mockError);
    });

    it('should set error state on fetchFilteredMembersFailed', () => {
      const action = MembersActions.fetchFilteredMembersFailed({ error: mockError });
      const state = membersReducer(initialState, action);

      expect(state.callState.status).toBe('error');
    });

    it('should set error state on fetchMemberFailed', () => {
      const action = MembersActions.fetchMemberFailed({ error: mockError });
      const state = membersReducer(initialState, action);

      expect(state.callState.status).toBe('error');
    });

    it('should set error state on addMemberFailed', () => {
      const action = MembersActions.addMemberFailed({ error: mockError });
      const state = membersReducer(initialState, action);

      expect(state.callState.status).toBe('error');
    });

    it('should set error state on updateMemberFailed', () => {
      const action = MembersActions.updateMemberFailed({ error: mockError });
      const state = membersReducer(initialState, action);

      expect(state.callState.status).toBe('error');
    });

    it('should set error state on deleteMemberFailed', () => {
      const action = MembersActions.deleteMemberFailed({ error: mockError });
      const state = membersReducer(initialState, action);

      expect(state.callState.status).toBe('error');
    });

    it('should set error state on updateMemberRatingsFailed', () => {
      const action = MembersActions.updateMemberRatingsFailed({ error: mockError });
      const state = membersReducer(initialState, action);

      expect(state.callState.status).toBe('error');
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
      expect(state.callState.status).toBe('idle');
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
      expect(state.lastFilteredFetch).toBeNull();
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
      expect(state.callState.status).toBe('idle');
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
      expect(state.callState.status).toBe('idle');
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
      expect(state.callState.status).toBe('idle');
      expect(state.lastFilteredFetch).toBeNull();
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
      expect(state.callState.status).toBe('idle');
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
      expect(state.callState.status).toBe('idle');
    });
  });

  describe('requestTimedOut', () => {
    it('should set timeout error', () => {
      const action = MembersActions.requestTimedOut();
      const state = membersReducer(initialState, action);

      expect(state.callState.status).toBe('error');
      expect(state.callState.error).toEqual({
        name: 'LCCError',
        message: 'Request timed out',
      });
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

      const action = MembersActions.fetchAllMembersRequested();
      const state = membersReducer(previousState, action);

      expect(previousState).toEqual(originalState);
      expect(state).not.toBe(previousState);
    });
  });
});
