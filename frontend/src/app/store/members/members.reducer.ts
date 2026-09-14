import { EntityState, createEntityAdapter } from '@ngrx/entity';
import { createReducer, on } from '@ngrx/store';
import { pick } from 'lodash';

import { INITIAL_MEMBER_FORM_DATA, MEMBER_FORM_DATA_PROPERTIES } from '@app/constants';
import {
  CallState,
  DataPaginationOptions,
  IsoDate,
  Member,
  MemberFormData,
} from '@app/models';
import { areSame } from '@app/utils';

import * as MembersActions from './members.actions';

export interface MembersState extends EntityState<{
  member: Member;
  formData: MemberFormData;
}> {
  callState: CallState;
  newMemberFormData: MemberFormData;
  lastFullFetch: IsoDate | null;
  lastFilteredFetch: IsoDate | null;
  filteredMembers: Member[];
  options: DataPaginationOptions<Member>;
  filteredCount: number | null;
  totalCount: number;
}

export const membersAdapter = createEntityAdapter<{
  member: Member;
  formData: MemberFormData;
}>({
  selectId: ({ member }) => member.id,
});

export const initialState: MembersState = membersAdapter.getInitialState({
  callState: {
    status: 'idle',
    loadStart: null,
    error: null,
  },
  newMemberFormData: INITIAL_MEMBER_FORM_DATA,
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

export const membersReducer = createReducer(
  initialState,

  on(
    MembersActions.fetchAllMembersRequested,
    MembersActions.fetchFilteredMembersRequested,
    MembersActions.fetchMemberRequested,
    MembersActions.addMemberRequested,
    MembersActions.updateMemberRequested,
    MembersActions.deleteMemberRequested,
    MembersActions.updateMemberRatingsRequested,
    MembersActions.createMemberAccountRequested,
    (state): MembersState => ({
      ...state,
      callState: {
        status: 'loading',
        loadStart: new Date().toISOString(),
        error: null,
      },
    }),
  ),

  on(MembersActions.fetchFilteredMembersInBackgroundRequested, (state): MembersState => ({
    ...state,
    callState: {
      status: 'background-loading',
      loadStart: new Date().toISOString(),
      error: null,
    },
  })),

  on(
    MembersActions.fetchAllMembersFailed,
    MembersActions.fetchFilteredMembersFailed,
    MembersActions.fetchMemberFailed,
    MembersActions.addMemberFailed,
    MembersActions.updateMemberFailed,
    MembersActions.deleteMemberFailed,
    MembersActions.updateMemberRatingsFailed,
    MembersActions.createMemberAccountFailed,
    (state, { error }): MembersState => ({
      ...state,
      callState: {
        status: 'error',
        loadStart: null,
        error,
      },
    }),
  ),

  on(
    MembersActions.fetchAllMembersSucceeded,
    (state, { members, totalCount }): MembersState =>
      membersAdapter.setAll(
        members.map(member => {
          const existingEntity = state.entities[member.id];
          const hasUnsavedChanges =
            existingEntity?.formData &&
            !areSame(existingEntity.formData, pick(member, MEMBER_FORM_DATA_PROPERTIES));

          return {
            member,
            // Preserve existing formData if there are unsaved changes
            formData: hasUnsavedChanges
              ? existingEntity.formData
              : pick(member, MEMBER_FORM_DATA_PROPERTIES),
          };
        }),
        {
          ...state,
          callState: initialState.callState,
          lastFullFetch: new Date().toISOString(),
          totalCount,
        },
      ),
  ),

  on(
    MembersActions.fetchFilteredMembersSucceeded,
    (state, { members, filteredCount, totalCount }): MembersState =>
      membersAdapter.upsertMany(
        members.map(member => {
          const existingEntity = state.entities[member.id];
          const hasUnsavedChanges =
            existingEntity?.formData &&
            !areSame(existingEntity.formData, pick(member, MEMBER_FORM_DATA_PROPERTIES));

          return {
            member,
            // Preserve existing formData if there are unsaved changes
            formData: hasUnsavedChanges
              ? existingEntity.formData
              : pick(member, MEMBER_FORM_DATA_PROPERTIES),
          };
        }),
        {
          ...state,
          callState: initialState.callState,
          lastFilteredFetch: new Date(Date.now()).toISOString(),
          filteredMembers: members,
          filteredCount,
          totalCount,
        },
      ),
  ),

  on(MembersActions.paginationOptionsChanged, (state, { options }): MembersState => ({
    ...state,
    options,
    lastFilteredFetch: null,
  })),

  on(MembersActions.fetchMemberSucceeded, (state, { member }): MembersState => {
    const previousFormData = state.entities[member.id]?.formData;
    return membersAdapter.upsertOne(
      {
        member,
        formData: previousFormData ?? pick(member, MEMBER_FORM_DATA_PROPERTIES),
      },
      { ...state, callState: initialState.callState },
    );
  }),

  on(MembersActions.addMemberSucceeded, (state, { member }): MembersState =>
    membersAdapter.upsertOne(
      {
        member,
        formData: pick(member, MEMBER_FORM_DATA_PROPERTIES),
      },
      {
        ...state,
        callState: initialState.callState,
        newMemberFormData: INITIAL_MEMBER_FORM_DATA,
      },
    ),
  ),

  on(
    MembersActions.updateMemberSucceeded,
    MembersActions.createMemberAccountSucceeded,
    (state, { member }): MembersState =>
      membersAdapter.upsertOne(
        {
          member,
          formData: pick(member, MEMBER_FORM_DATA_PROPERTIES),
        },
        {
          ...state,
          callState: initialState.callState,
          lastFilteredFetch: null,
        },
      ),
  ),

  on(MembersActions.updateMemberRatingsSucceeded, (state, { members }): MembersState =>
    membersAdapter.upsertMany(
      members.map(member => {
        const existingEntity = state.entities[member.id];
        const hasUnsavedChanges =
          existingEntity?.formData &&
          !areSame(existingEntity.formData, pick(member, MEMBER_FORM_DATA_PROPERTIES));

        return {
          member,
          // Preserve existing formData if there are unsaved changes
          formData: hasUnsavedChanges
            ? existingEntity.formData
            : pick(member, MEMBER_FORM_DATA_PROPERTIES),
        };
      }),
      { ...state, callState: initialState.callState, lastFilteredFetch: null },
    ),
  ),

  on(MembersActions.deleteMemberSucceeded, (state, { memberId }): MembersState =>
    membersAdapter.removeOne(memberId, {
      ...state,
      callState: initialState.callState,
      lastFilteredFetch: null,
    }),
  ),

  on(MembersActions.formDataChanged, (state, { memberId, formData }): MembersState => {
    const originalMember = memberId ? state.entities[memberId] : null;

    if (!originalMember) {
      return {
        ...state,
        newMemberFormData: {
          ...state.newMemberFormData,
          ...formData,
        },
      };
    }

    return membersAdapter.upsertOne(
      {
        ...originalMember,
        formData: {
          ...(originalMember?.formData ?? INITIAL_MEMBER_FORM_DATA),
          ...formData,
        },
      },
      state,
    );
  }),

  on(MembersActions.formDataRestored, (state, { memberId }): MembersState => {
    const originalMember = memberId ? state.entities[memberId]?.member : null;

    if (!originalMember) {
      return {
        ...state,
        newMemberFormData: INITIAL_MEMBER_FORM_DATA,
      };
    }

    return membersAdapter.upsertOne(
      {
        member: originalMember,
        formData: pick(originalMember, MEMBER_FORM_DATA_PROPERTIES),
      },
      state,
    );
  }),

  on(MembersActions.requestTimedOut, (state): MembersState => ({
    ...state,
    callState: {
      status: 'error',
      loadStart: null,
      error: { name: 'LCCError', message: 'Request timed out' },
    },
  })),
);
