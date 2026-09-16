import { createFeatureSelector, createSelector } from '@ngrx/store';

import { Id } from '@app/models';

import {
  MembersState,
  hasFormChanges,
  memberFormDataOf,
  membersAdapter,
} from './members.reducer';

const selectMembersState = createFeatureSelector<MembersState>('membersState');

export const selectCallState = createSelector(
  selectMembersState,
  state => state.callState,
);

export const selectRecordsScope = createSelector(
  selectMembersState,
  state => state.recordsScope,
);

export const selectLastFullFetch = createSelector(
  selectMembersState,
  state => state.lastFullFetch,
);

export const selectLastFilteredFetch = createSelector(
  selectMembersState,
  state => state.lastFilteredFetch,
);

export const selectFilteredMembers = createSelector(
  selectMembersState,
  state => state.filteredMembers,
);

export const selectOptions = createSelector(selectMembersState, state => state.options);

export const selectFilteredCount = createSelector(
  selectMembersState,
  state => state.filteredCount,
);

export const selectTotalCount = createSelector(
  selectMembersState,
  state => state.totalCount,
);

const { selectAll: selectAllMemberEntities } =
  membersAdapter.getSelectors(selectMembersState);

export const selectAllMembers = createSelector(
  selectAllMemberEntities,
  allMemberEntities => allMemberEntities.map(entity => entity?.member),
);

export const selectMemberById = (id: Id | null) =>
  createSelector(
    selectAllMembers,
    allMembers => allMembers.find(member => member.id === id) ?? null,
  );

export const selectMemberByNumber = (number: number) =>
  createSelector(
    selectAllMembers,
    allMembers => allMembers.find(member => member.number === number) ?? null,
  );

export const selectMemberFormDataById = (id: Id | null) =>
  createSelector(
    selectMembersState,
    selectAllMemberEntities,
    (state, allMemberEntities) => {
      const entity = allMemberEntities.find(entity => entity.member.id === id);
      return entity ? memberFormDataOf(entity) : state.newMemberFormData;
    },
  );

export const selectHasUnsavedChanges = (id: Id | null) =>
  createSelector(selectMemberById(id), selectMemberFormDataById(id), hasFormChanges);
