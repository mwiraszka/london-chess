import { EntityState, createEntityAdapter } from '@ngrx/entity';
import { createReducer, on } from '@ngrx/store';

import {
  IsoDate,
  MemberTournamentResult,
  Tournament,
  TournamentSummary,
} from '@app/models';

import * as TournamentsActions from './tournaments.actions';

export type TournamentsLoad = 'summaries' | 'tournament' | 'member-results';

export interface TournamentsState extends EntityState<Tournament> {
  // Loads whose latest attempt failed
  failedLoads: TournamentsLoad[];
  summaries: TournamentSummary[];
  lastSummariesFetch: IsoDate | null;
  memberResults: Record<number, MemberTournamentResult[]>;
}

export const tournamentsAdapter = createEntityAdapter<Tournament>({
  selectId: ({ number }) => number,
});

export const initialState: TournamentsState = tournamentsAdapter.getInitialState({
  failedLoads: [],
  summaries: [],
  lastSummariesFetch: null,
  memberResults: {},
});

function withLoadAttempt(
  state: TournamentsState,
  load: TournamentsLoad,
): TournamentsState {
  return { ...state, failedLoads: state.failedLoads.filter(failed => failed !== load) };
}

function withFailedLoad(
  state: TournamentsState,
  load: TournamentsLoad,
): TournamentsState {
  return { ...state, failedLoads: [...withLoadAttempt(state, load).failedLoads, load] };
}

export const tournamentsReducer = createReducer(
  initialState,

  on(TournamentsActions.fetchTournamentsRequested, (state): TournamentsState =>
    withLoadAttempt(state, 'summaries'),
  ),
  on(TournamentsActions.fetchTournamentsFailed, (state): TournamentsState =>
    withFailedLoad(state, 'summaries'),
  ),
  on(
    TournamentsActions.fetchTournamentsSucceeded,
    (state, { summaries }): TournamentsState => ({
      ...state,
      summaries,
      lastSummariesFetch: new Date().toISOString(),
    }),
  ),

  on(TournamentsActions.fetchTournamentRequested, (state): TournamentsState =>
    withLoadAttempt(state, 'tournament'),
  ),
  on(TournamentsActions.fetchTournamentFailed, (state): TournamentsState =>
    withFailedLoad(state, 'tournament'),
  ),
  on(
    TournamentsActions.fetchTournamentSucceeded,
    (state, { tournament }): TournamentsState =>
      tournamentsAdapter.upsertOne(tournament, state),
  ),

  on(TournamentsActions.fetchMemberTournamentsRequested, (state): TournamentsState =>
    withLoadAttempt(state, 'member-results'),
  ),
  on(TournamentsActions.fetchMemberTournamentsFailed, (state): TournamentsState =>
    withFailedLoad(state, 'member-results'),
  ),
  on(
    TournamentsActions.fetchMemberTournamentsSucceeded,
    (state, { memberNumber, results }): TournamentsState => ({
      ...state,
      memberResults: { ...state.memberResults, [memberNumber]: results },
    }),
  ),
);
