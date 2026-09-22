import { EntityState, createEntityAdapter } from '@ngrx/entity';
import { createReducer, on } from '@ngrx/store';

import { INITIAL_GAMES_QUERY } from '@app/constants/games';
import {
  ArchivePlayer,
  ArchiveTournament,
  Game,
  GamesQuery,
  GamesSummary,
  IsoDate,
} from '@app/models';

import * as GamesActions from './games.actions';

export type GamesLoad = 'filtered' | 'game' | 'reference';

export interface GamesState extends EntityState<Game> {
  // Loads whose latest attempt failed
  failedLoads: GamesLoad[];
  // Whether a page of filtered games is on its way, never persisted
  isFetchingFiltered: boolean;
  lastFilteredFetch: IsoDate | null;
  lastReferenceFetch: IsoDate | null;
  filteredGames: Game[];
  filteredCount: number | null;
  query: GamesQuery;
  players: ArchivePlayer[];
  tournaments: ArchiveTournament[];
  summary: GamesSummary | null;
}

export const gamesAdapter = createEntityAdapter<Game>();

export const initialState: GamesState = gamesAdapter.getInitialState({
  failedLoads: [],
  isFetchingFiltered: false,
  lastFilteredFetch: null,
  lastReferenceFetch: null,
  filteredGames: [],
  filteredCount: null,
  query: INITIAL_GAMES_QUERY,
  players: [],
  tournaments: [],
  summary: null,
});

function withLoadAttempt(state: GamesState, load: GamesLoad): GamesState {
  return { ...state, failedLoads: state.failedLoads.filter(failed => failed !== load) };
}

function withFailedLoad(state: GamesState, load: GamesLoad): GamesState {
  return { ...state, failedLoads: [...withLoadAttempt(state, load).failedLoads, load] };
}

export const gamesReducer = createReducer(
  initialState,

  on(GamesActions.fetchFilteredGamesRequested, (state): GamesState => ({
    ...withLoadAttempt(state, 'filtered'),
    isFetchingFiltered: true,
  })),
  on(GamesActions.fetchFilteredGamesFailed, (state): GamesState => ({
    ...withFailedLoad(state, 'filtered'),
    isFetchingFiltered: false,
  })),
  on(
    GamesActions.fetchFilteredGamesSucceeded,
    (state, { games, filteredCount }): GamesState =>
      gamesAdapter.upsertMany(games, {
        ...state,
        isFetchingFiltered: false,
        filteredGames: games,
        filteredCount,
        lastFilteredFetch: new Date().toISOString(),
      }),
  ),

  on(GamesActions.fetchGameRequested, (state): GamesState =>
    withLoadAttempt(state, 'game'),
  ),
  on(GamesActions.fetchGameFailed, (state): GamesState => withFailedLoad(state, 'game')),
  on(GamesActions.fetchGameSucceeded, (state, { game }): GamesState =>
    gamesAdapter.upsertOne(game, state),
  ),

  on(GamesActions.fetchArchiveReferenceRequested, (state): GamesState =>
    withLoadAttempt(state, 'reference'),
  ),
  on(GamesActions.fetchArchiveReferenceFailed, (state): GamesState =>
    withFailedLoad(state, 'reference'),
  ),
  on(
    GamesActions.fetchArchiveReferenceSucceeded,
    (state, { players, tournaments, summary }): GamesState => ({
      ...state,
      players,
      tournaments,
      summary,
      lastReferenceFetch: new Date().toISOString(),
    }),
  ),

  on(GamesActions.queryChanged, (state, { query }): GamesState => ({
    ...state,
    query,
    // Results of one query never stand in for another's, but the count stays as the
    // best estimate until the next one arrives
    filteredGames: [],
    lastFilteredFetch: null,
  })),
);
