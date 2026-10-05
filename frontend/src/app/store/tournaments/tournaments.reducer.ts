import { EntityState, createEntityAdapter } from '@ngrx/entity';
import { createReducer, on } from '@ngrx/store';
import { omit } from 'lodash';

import { INITIAL_TOURNAMENT_FORM_DATA } from '@app/constants/tournaments';
import {
  IsoDate,
  MemberTournamentResult,
  Tournament,
  TournamentFormData,
  TournamentRegistrant,
  TournamentSummary,
} from '@app/models';
import { tournamentFormData, withFailedLoad, withLoadAttempt } from '@app/utils';

import * as TournamentsActions from './tournaments.actions';

export type TournamentsLoad = 'summaries' | 'tournament' | 'member-results';

export interface TournamentsState extends EntityState<Tournament> {
  // Loads whose latest attempt failed
  failedLoads: TournamentsLoad[];
  summaries: TournamentSummary[];
  lastSummariesFetch: IsoDate | null;
  memberResults: Record<number, MemberTournamentResult[]>;
  // Unsaved edits of recorded tournaments, by number
  formData: Record<number, TournamentFormData>;
  newTournamentFormData: TournamentFormData;
}

export const tournamentsAdapter = createEntityAdapter<Tournament>({
  selectId: ({ number }) => number,
});

export const initialState: TournamentsState = tournamentsAdapter.getInitialState({
  failedLoads: [],
  summaries: [],
  lastSummariesFetch: null,
  memberResults: {},
  formData: {},
  newTournamentFormData: INITIAL_TOURNAMENT_FORM_DATA,
});

function withRegistrants(
  state: TournamentsState,
  tournamentNumber: number,
  registrants: TournamentRegistrant[],
): TournamentsState {
  const withSummary: TournamentsState = {
    ...state,
    summaries: state.summaries.map(summary =>
      summary.number === tournamentNumber
        ? { ...summary, registrationCount: registrants.length }
        : summary,
    ),
  };
  return state.entities[tournamentNumber]
    ? tournamentsAdapter.updateOne(
        { id: tournamentNumber, changes: { registrants } },
        withSummary,
      )
    : withSummary;
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

  on(TournamentsActions.formDataChanged, (state, { tournamentNumber, formData }) => {
    if (tournamentNumber === null) {
      return {
        ...state,
        newTournamentFormData: { ...state.newTournamentFormData, ...formData },
      };
    }
    const tournament = state.entities[tournamentNumber];
    // A draft is kept against the recorded tournament, so a change arriving once a save
    // has unloaded it, as the closing editor sends, starts no draft
    if (!tournament) {
      return state;
    }
    const draft = state.formData[tournamentNumber] ?? tournamentFormData(tournament);
    return {
      ...state,
      formData: { ...state.formData, [tournamentNumber]: { ...draft, ...formData } },
    };
  }),

  on(TournamentsActions.formDataRestored, (state, { tournamentNumber }) =>
    tournamentNumber === null
      ? { ...state, newTournamentFormData: INITIAL_TOURNAMENT_FORM_DATA }
      : { ...state, formData: omit(state.formData, tournamentNumber) },
  ),

  // Saved tournaments are fetched afresh, their results having been stored server-side
  on(TournamentsActions.addTournamentSucceeded, (state): TournamentsState => ({
    ...state,
    newTournamentFormData: INITIAL_TOURNAMENT_FORM_DATA,
    lastSummariesFetch: null,
  })),
  on(
    TournamentsActions.updateTournamentSucceeded,
    (state, { tournamentNumber }): TournamentsState =>
      tournamentsAdapter.removeOne(tournamentNumber, {
        ...state,
        formData: omit(state.formData, tournamentNumber),
        lastSummariesFetch: null,
      }),
  ),
  on(
    TournamentsActions.deleteTournamentSucceeded,
    (state, { tournamentNumber }): TournamentsState =>
      tournamentsAdapter.removeOne(tournamentNumber, {
        ...state,
        summaries: state.summaries.filter(({ number }) => number !== tournamentNumber),
        formData: omit(state.formData, tournamentNumber),
      }),
  ),

  on(
    TournamentsActions.registrationSucceeded,
    TournamentsActions.withdrawalSucceeded,
    (state, { tournamentNumber, registrants }): TournamentsState =>
      withRegistrants(state, tournamentNumber, registrants),
  ),
);
