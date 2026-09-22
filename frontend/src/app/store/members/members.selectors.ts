import { createFeatureSelector, createSelector } from '@ngrx/store';

import { Id } from '@app/models';
import { loadStatus } from '@app/utils';

import {
  MembersState,
  hasFormChanges,
  memberFormDataOf,
  membersAdapter,
} from './members.reducer';

const selectMembersState = createFeatureSelector<MembersState>('membersState');

const selectFailedLoads = createSelector(selectMembersState, state => state.failedLoads);

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

export const selectFilteredMembersStatus = createSelector(
  selectLastFilteredFetch,
  selectFailedLoads,
  (lastFetch, failedLoads) =>
    loadStatus(lastFetch !== null, failedLoads.includes('filtered')),
);

export const selectMemberProfileStatus = (number: number) =>
  createSelector(selectMemberByNumber(number), selectFailedLoads, (member, failedLoads) =>
    loadStatus(!!member, failedLoads.includes('member')),
  );

// Only a record from the admin API holds every detail the member form edits
export const selectEditableMemberStatus = (id: Id) =>
  createSelector(
    selectMemberById(id),
    selectRecordsScope,
    selectFailedLoads,
    (member, recordsScope, failedLoads) =>
      loadStatus(!!member && recordsScope === 'admin', failedLoads.includes('member')),
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

export const selectIsFetchingFiltered = createSelector(
  selectMembersState,
  state => state.isFetchingFiltered,
);
