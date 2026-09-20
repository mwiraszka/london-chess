import { INITIAL_GAMES_QUERY } from '@app/constants/games';
import {
  MOCK_ARCHIVE_PLAYERS,
  MOCK_ARCHIVE_TOURNAMENTS,
  MOCK_GAMES,
  MOCK_GAMES_SUMMARY,
} from '@app/mocks/games.mock';

import { GamesState, gamesAdapter, initialState } from './games.reducer';
import * as GamesSelectors from './games.selectors';

describe('Games Selectors', () => {
  const loadedState: GamesState = gamesAdapter.setAll(MOCK_GAMES, {
    ...initialState,
    lastFilteredFetch: '2026-01-15T10:00:00.000Z',
    lastReferenceFetch: '2026-01-15T10:00:00.000Z',
    filteredGames: MOCK_GAMES,
    filteredCount: 3,
    query: { ...INITIAL_GAMES_QUERY, page: 2 },
    players: MOCK_ARCHIVE_PLAYERS,
    tournaments: MOCK_ARCHIVE_TOURNAMENTS,
    summary: MOCK_GAMES_SUMMARY,
  });

  const withState = (gamesState: GamesState) => ({ gamesState });

  it('should select the stored values', () => {
    const state = withState(loadedState);

    expect(GamesSelectors.selectQuery(state)).toEqual({
      ...INITIAL_GAMES_QUERY,
      page: 2,
    });
    expect(GamesSelectors.selectFilteredGames(state)).toEqual(MOCK_GAMES);
    expect(GamesSelectors.selectFilteredCount(state)).toBe(3);
    expect(GamesSelectors.selectPlayers(state)).toEqual(MOCK_ARCHIVE_PLAYERS);
    expect(GamesSelectors.selectTournaments(state)).toEqual(MOCK_ARCHIVE_TOURNAMENTS);
    expect(GamesSelectors.selectSummary(state)).toEqual(MOCK_GAMES_SUMMARY);
  });

  describe('selectGameById', () => {
    it('should find a stored game', () => {
      expect(
        GamesSelectors.selectGameById(MOCK_GAMES[1].id)(withState(loadedState)),
      ).toEqual(MOCK_GAMES[1]);
    });

    it('should be null for a game that is not stored', () => {
      expect(GamesSelectors.selectGameById('unknown')(withState(loadedState))).toBeNull();
    });
  });

  describe('selectFilteredGamesStatus', () => {
    it('should be loading until the results arrive', () => {
      expect(GamesSelectors.selectFilteredGamesStatus(withState(initialState))).toBe(
        'loading',
      );
    });

    it('should be failed when the results could not be loaded', () => {
      expect(
        GamesSelectors.selectFilteredGamesStatus(
          withState({ ...initialState, failedLoads: ['filtered'] }),
        ),
      ).toBe('failed');
    });

    it('should stay loaded when a later refresh fails', () => {
      expect(
        GamesSelectors.selectFilteredGamesStatus(
          withState({ ...loadedState, failedLoads: ['filtered'] }),
        ),
      ).toBe('loaded');
    });
  });

  describe('selectReferenceStatus', () => {
    it('should be loading until the reference data arrives', () => {
      expect(GamesSelectors.selectReferenceStatus(withState(initialState))).toBe(
        'loading',
      );
    });

    it('should be failed when the reference data could not be loaded', () => {
      expect(
        GamesSelectors.selectReferenceStatus(
          withState({ ...initialState, failedLoads: ['reference'] }),
        ),
      ).toBe('failed');
    });

    it('should be loaded once the reference data is stored', () => {
      expect(GamesSelectors.selectReferenceStatus(withState(loadedState))).toBe('loaded');
    });
  });

  describe('selectGameStatus', () => {
    it('should be loaded once the game is stored', () => {
      expect(
        GamesSelectors.selectGameStatus(MOCK_GAMES[0].id)(withState(loadedState)),
      ).toBe('loaded');
    });

    it('should be failed when the game could not be loaded', () => {
      expect(
        GamesSelectors.selectGameStatus('unknown')(
          withState({ ...initialState, failedLoads: ['game'] }),
        ),
      ).toBe('failed');
    });

    it('should be loading while the game is missing', () => {
      expect(GamesSelectors.selectGameStatus('unknown')(withState(loadedState))).toBe(
        'loading',
      );
    });
  });
});
