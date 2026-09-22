import { createFeatureSelector, createSelector } from '@ngrx/store';

import { loadStatus } from '@app/utils';

import { TournamentsState, tournamentsAdapter } from './tournaments.reducer';

const selectTournamentsState =
  createFeatureSelector<TournamentsState>('tournamentsState');

const selectFailedLoads = createSelector(
  selectTournamentsState,
  state => state.failedLoads,
);

export const selectSummaries = createSelector(
  selectTournamentsState,
  state => state.summaries,
);

export const selectLastSummariesFetch = createSelector(
  selectTournamentsState,
  state => state.lastSummariesFetch,
);

export const selectSummariesStatus = createSelector(
  selectLastSummariesFetch,
  selectFailedLoads,
  (lastFetch, failedLoads) =>
    loadStatus(lastFetch !== null, failedLoads.includes('summaries')),
);

const { selectEntities: selectTournamentEntities } =
  tournamentsAdapter.getSelectors(selectTournamentsState);

export const selectTournamentByNumber = (tournamentNumber: number) =>
  createSelector(
    selectTournamentEntities,
    entities => entities[tournamentNumber] ?? null,
  );

export const selectTournamentStatus = (tournamentNumber: number) =>
  createSelector(
    selectTournamentByNumber(tournamentNumber),
    selectFailedLoads,
    (tournament, failedLoads) =>
      loadStatus(!!tournament, failedLoads.includes('tournament')),
  );

export const selectMemberResults = (memberNumber: number) =>
  createSelector(
    selectTournamentsState,
    state => state.memberResults[memberNumber] ?? null,
  );

export const selectMemberResultsStatus = (memberNumber: number) =>
  createSelector(
    selectMemberResults(memberNumber),
    selectFailedLoads,
    (results, failedLoads) =>
      loadStatus(results !== null, failedLoads.includes('member-results')),
  );
