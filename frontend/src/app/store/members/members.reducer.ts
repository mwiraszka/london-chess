import { EntityState, createEntityAdapter } from '@ngrx/entity';
import { createReducer, on } from '@ngrx/store';
import { pick } from 'lodash';

import { INITIAL_MEMBER_FORM_DATA, MEMBER_FORM_DATA_PROPERTIES } from '@app/constants';
import {
  ApiScope,
  DataPaginationOptions,
  Id,
  IsoDate,
  Member,
  MemberFormData,
} from '@app/models';
import { areSame } from '@app/utils';

import * as MembersActions from './members.actions';

export interface MemberEntity {
  member: Member;
  // Written by the member form, so a member nobody has opened has no draft
  formData: MemberFormData | null;
}

export type MembersLoad = 'filtered' | 'member';

export interface MembersState extends EntityState<MemberEntity> {
  newMemberFormData: MemberFormData;
  // Loads whose latest attempt failed, which are never persisted
  failedLoads: MembersLoad[];
  // Whether a page of filtered members is on its way, never persisted
  isFetchingFiltered: boolean;
  // Public records leave out private details, so records from both APIs are never mixed
  recordsScope: ApiScope | null;
  lastFullFetch: IsoDate | null;
  lastFilteredFetch: IsoDate | null;
  filteredMembers: Member[];
  options: DataPaginationOptions<Member>;
  filteredCount: number | null;
  totalCount: number;
}

export const membersAdapter = createEntityAdapter<MemberEntity>({
  selectId: ({ member }) => member.id,
});

export const initialState: MembersState = membersAdapter.getInitialState({
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

export function memberFormDataOf({ member, formData }: MemberEntity): MemberFormData {
  const memberFormData = formData ?? pick(member, MEMBER_FORM_DATA_PROPERTIES);

  // An account holder's email belongs to their account, so a draft never overrides it
  return member.hasAccount ? { ...memberFormData, email: member.email } : memberFormData;
}

export function hasFormChanges(member: Member | null, formData: MemberFormData): boolean {
  const formPropertiesOfOriginalMember = pick(
    member ?? INITIAL_MEMBER_FORM_DATA,
    Object.getOwnPropertyNames(formData),
  );

  // Only concerned with the day portion of these dates when checking for unsaved changes
  const { dateJoined: originalDateJoined, ...originalRemainder } =
    formPropertiesOfOriginalMember;
  const { dateJoined: formDataDateJoined, ...formDataRemainder } = formData;

  return (
    originalDateJoined?.slice(0, 10) !== formDataDateJoined?.slice(0, 10) ||
    !areSame(formDataRemainder, originalRemainder)
  );
}

function draftWithEdits(entity: MemberEntity | undefined): MemberFormData | null {
  return entity && hasFormChanges(entity.member, memberFormDataOf(entity))
    ? entity.formData
    : null;
}

function mergedEntity(existing: MemberEntity | undefined, member: Member): MemberEntity {
  return {
    // Profile lookups carry fields the list leaves out
    member: { ...existing?.member, ...member },
    formData: draftWithEdits(existing),
  };
}

function withRecordsScope(state: MembersState, scope: ApiScope): MembersState {
  if (state.recordsScope === scope) {
    return state;
  }

  return membersAdapter.removeAll({
    ...state,
    recordsScope: scope,
    lastFullFetch: null,
    lastFilteredFetch: null,
    filteredMembers: [],
    filteredCount: null,
  });
}

function withLoadAttempt(state: MembersState, load: MembersLoad): MembersState {
  return { ...state, failedLoads: state.failedLoads.filter(failed => failed !== load) };
}

function withFailedLoad(state: MembersState, load: MembersLoad): MembersState {
  return { ...state, failedLoads: [...withLoadAttempt(state, load).failedLoads, load] };
}

function withUpdatedMembers(members: Member[], updates: Member[]): Member[] {
  const updatesById = new Map<Id, Member>(updates.map(member => [member.id, member]));
  return members.map(member => updatesById.get(member.id) ?? member);
}

export const membersReducer = createReducer(
  initialState,

  on(MembersActions.fetchFilteredMembersRequested, (state): MembersState => ({
    ...withLoadAttempt(state, 'filtered'),
    isFetchingFiltered: true,
  })),
  on(MembersActions.fetchFilteredMembersFailed, (state): MembersState => ({
    ...withFailedLoad(state, 'filtered'),
    isFetchingFiltered: false,
  })),

  on(
    MembersActions.fetchMemberRequested,
    MembersActions.fetchMemberByNumberRequested,
    (state): MembersState => withLoadAttempt(state, 'member'),
  ),
  on(MembersActions.fetchMemberFailed, (state): MembersState =>
    withFailedLoad(state, 'member'),
  ),

  on(
    MembersActions.fetchAllMembersSucceeded,
    (state, { members, totalCount, scope }): MembersState => {
      const isSameScope = state.recordsScope === scope;
      const fetchedMembers = new Map(members.map(member => [member.id, member]));

      return membersAdapter.setAll(
        members.map(member =>
          mergedEntity(isSameScope ? state.entities[member.id] : undefined, member),
        ),
        {
          ...state,
          recordsScope: scope,
          lastFullFetch: new Date().toISOString(),
          // Every member on the page shown is in the full list, so the page switches over too
          filteredMembers: isSameScope
            ? state.filteredMembers
            : state.filteredMembers.flatMap(
                member => fetchedMembers.get(member.id) ?? [],
              ),
          totalCount,
        },
      );
    },
  ),

  on(
    MembersActions.fetchFilteredMembersSucceeded,
    (state, { members, filteredCount, totalCount, scope }): MembersState => {
      const scopedState = withRecordsScope(state, scope);

      return membersAdapter.upsertMany(
        members.map(member => mergedEntity(scopedState.entities[member.id], member)),
        {
          ...scopedState,
          isFetchingFiltered: false,
          lastFilteredFetch: new Date(Date.now()).toISOString(),
          filteredMembers: members,
          filteredCount,
          totalCount,
        },
      );
    },
  ),

  on(MembersActions.paginationOptionsChanged, (state, { options }): MembersState => ({
    ...state,
    options,
  })),

  on(MembersActions.fetchMemberSucceeded, (state, { member, scope }): MembersState => {
    const scopedState = withRecordsScope(state, scope);

    return membersAdapter.upsertOne(
      { member, formData: draftWithEdits(scopedState.entities[member.id]) },
      scopedState,
    );
  }),

  on(MembersActions.addMemberSucceeded, (state, { member }): MembersState =>
    membersAdapter.upsertOne(
      { member, formData: null },
      {
        ...state,
        newMemberFormData: INITIAL_MEMBER_FORM_DATA,
      },
    ),
  ),

  on(MembersActions.updateMemberSucceeded, (state, { member }): MembersState =>
    membersAdapter.upsertOne(
      { member, formData: null },
      {
        ...state,
        filteredMembers: withUpdatedMembers(state.filteredMembers, [member]),
      },
    ),
  ),

  on(MembersActions.updateMemberRatingsSucceeded, (state, { members }): MembersState =>
    membersAdapter.upsertMany(
      members.map(member => ({
        member,
        formData: draftWithEdits(state.entities[member.id]),
      })),
      { ...state, filteredMembers: withUpdatedMembers(state.filteredMembers, members) },
    ),
  ),

  on(MembersActions.deleteMemberSucceeded, (state, { memberId }): MembersState =>
    membersAdapter.removeOne(memberId, {
      ...state,
      filteredMembers: state.filteredMembers.filter(({ id }) => id !== memberId),
    }),
  ),

  on(MembersActions.formDataChanged, (state, { memberId, formData }): MembersState => {
    const entity = memberId ? state.entities[memberId] : undefined;

    if (!entity) {
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
        ...entity,
        formData: {
          ...(entity.formData ?? pick(entity.member, MEMBER_FORM_DATA_PROPERTIES)),
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

    return membersAdapter.upsertOne({ member: originalMember, formData: null }, state);
  }),
);
