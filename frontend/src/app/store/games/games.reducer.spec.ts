import { INITIAL_GAMES_QUERY } from '@app/constants/games';
import {
  MOCK_ARCHIVE_PLAYERS,
  MOCK_ARCHIVE_TOURNAMENTS,
  MOCK_GAMES,
  MOCK_GAMES_SUMMARY,
} from '@app/mocks/games.mock';
import { LccError } from '@app/models';

import * as GamesActions from './games.actions';
import { gamesReducer, initialState } from './games.reducer';

describe('Games Reducer', () => {
  const mockError: LccError = { name: 'LCCError', message: 'Something went wrong' };

  it('should return the default state for an unknown action', () => {
    expect(gamesReducer(initialState, { type: 'Unknown' })).toBe(initialState);
  });

  it('should start with nothing loaded and the default query', () => {
    expect(initialState).toEqual({
      ids: [],
      entities: {},
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
  });

  describe('failed loads', () => {
    it('should record each load whose request fails', () => {
      let state = gamesReducer(
        initialState,
        GamesActions.fetchFilteredGamesFailed({ error: mockError }),
      );
      state = gamesReducer(state, GamesActions.fetchGameFailed({ error: mockError }));
      state = gamesReducer(
        state,
        GamesActions.fetchArchiveReferenceFailed({ error: mockError }),
      );

      expect(state.failedLoads).toEqual(['filtered', 'game', 'reference']);
    });

    it('should forget a failure once the load is attempted again', () => {
      const failed = gamesReducer(
        initialState,
        GamesActions.fetchFilteredGamesFailed({ error: mockError }),
      );

      const state = gamesReducer(failed, GamesActions.fetchFilteredGamesRequested());

      expect(state.failedLoads).toEqual([]);
    });
  });

  describe('fetchFilteredGamesSucceeded', () => {
    it('should store the page of games and the counts', () => {
      const state = gamesReducer(
        initialState,
        GamesActions.fetchFilteredGamesSucceeded({
          games: MOCK_GAMES,
          filteredCount: 3,
        }),
      );

      expect(state.filteredGames).toEqual(MOCK_GAMES);
      expect(state.filteredCount).toBe(3);
      expect(state.lastFilteredFetch).not.toBeNull();
      expect(state.ids).toEqual(MOCK_GAMES.map(game => game.id));
    });
  });

  describe('fetchGameSucceeded', () => {
    it('should store the game without touching the current results', () => {
      const state = gamesReducer(
        initialState,
        GamesActions.fetchGameSucceeded({ game: MOCK_GAMES[1] }),
      );

      expect(state.entities[MOCK_GAMES[1].id]).toEqual(MOCK_GAMES[1]);
      expect(state.filteredGames).toEqual([]);
      expect(state.lastFilteredFetch).toBeNull();
    });
  });

  describe('fetchArchiveReferenceSucceeded', () => {
    it('should store the players, tournaments and summary', () => {
      const state = gamesReducer(
        initialState,
        GamesActions.fetchArchiveReferenceSucceeded({
          players: MOCK_ARCHIVE_PLAYERS,
          tournaments: MOCK_ARCHIVE_TOURNAMENTS,
          summary: MOCK_GAMES_SUMMARY,
        }),
      );

      expect(state.players).toEqual(MOCK_ARCHIVE_PLAYERS);
      expect(state.tournaments).toEqual(MOCK_ARCHIVE_TOURNAMENTS);
      expect(state.summary).toEqual(MOCK_GAMES_SUMMARY);
      expect(state.lastReferenceFetch).not.toBeNull();
    });
  });

  describe('queryChanged', () => {
    it('should replace the query and drop the results of the previous one, keeping its count', () => {
      const loaded = gamesReducer(
        initialState,
        GamesActions.fetchFilteredGamesSucceeded({
          games: MOCK_GAMES,
          filteredCount: 3,
        }),
      );
      const query = { ...INITIAL_GAMES_QUERY, page: 2 };

      const state = gamesReducer(loaded, GamesActions.queryChanged({ query }));

      expect(state.query).toEqual(query);
      expect(state.filteredGames).toEqual([]);
      expect(state.filteredCount).toBe(3);
      expect(state.lastFilteredFetch).toBeNull();
      expect(state.entities[MOCK_GAMES[0].id]).toEqual(MOCK_GAMES[0]);
    });
  });
});
