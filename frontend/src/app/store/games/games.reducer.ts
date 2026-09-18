import { EntityState, createEntityAdapter } from '@ngrx/entity';
import { createReducer, on } from '@ngrx/store';

import { INITIAL_GAMES_QUERY } from '@app/constants/games';
import {
  ArchivePlayer,
  Game,
  GamesQuery,
  GamesSummary,
  IsoDate,
  Tournament,
} from '@app/models';

import * as GamesActions from './games.actions';

export type GamesLoad = 'filtered' | 'game' | 'reference';

export interface GamesState extends EntityState<Game> {
  // Loads whose latest attempt failed
  failedLoads: GamesLoad[];
  lastFilteredFetch: IsoDate | null;
  lastReferenceFetch: IsoDate | null;
  filteredGames: Game[];
  filteredCount: number | null;
  query: GamesQuery;
  players: ArchivePlayer[];
  tournaments: Tournament[];
  summary: GamesSummary | null;
}

export const gamesAdapter = createEntityAdapter<Game>();

export const initialState: GamesState = gamesAdapter.getInitialState({
  failedLoads: [],
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

  on(GamesActions.fetchFilteredGamesRequested, (state): GamesState =>
    withLoadAttempt(state, 'filtered'),
  ),
  on(GamesActions.fetchFilteredGamesFailed, (state): GamesState =>
    withFailedLoad(state, 'filtered'),
  ),
  on(
    GamesActions.fetchFilteredGamesSucceeded,
    (state, { games, filteredCount }): GamesState =>
      gamesAdapter.upsertMany(games, {
        ...state,
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
