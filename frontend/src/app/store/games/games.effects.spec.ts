import { provideMockActions } from '@ngrx/effects/testing';
import { routerNavigatedAction } from '@ngrx/router-store';
import { Action } from '@ngrx/store';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { ReplaySubject, of, throwError } from 'rxjs';

import { TestBed } from '@angular/core/testing';
import { NavigationEnd } from '@angular/router';

import { INITIAL_GAMES_QUERY } from '@app/constants/games';
import {
  MOCK_ARCHIVE_PLAYERS,
  MOCK_GAMES,
  MOCK_GAMES_SUMMARY,
  MOCK_TOURNAMENTS,
} from '@app/mocks/games.mock';
import { LccError } from '@app/models';
import { GamesApiService } from '@app/services';
import { AppActions } from '@app/store/app';
import { IS_EXPIRED, PARSE_ERROR } from '@app/tokens';

import { GamesActions, GamesSelectors } from '.';
import { GamesEffects } from './games.effects';

describe('GamesEffects', () => {
  let actions$: ReplaySubject<Action>;
  let effects: GamesEffects;
  let gamesApiService: Mocked<GamesApiService>;
  let store: MockStore;

  const mockIsExpired = vi.fn();
  const mockParseError = vi.fn();
  const mockError: LccError = { name: 'LCCError', message: 'Test error' };

  // The effect reads only the navigation event's URL
  const navigatedTo = (url: string): Action & { payload: { event: NavigationEnd } } => ({
    type: routerNavigatedAction.type,
    payload: { event: new NavigationEnd(1, url, url) },
  });

  beforeEach(() => {
    actions$ = new ReplaySubject<Action>(1);

    TestBed.configureTestingModule({
      providers: [
        GamesEffects,
        provideMockActions(() => actions$),
        provideMockStore(),
        { provide: IS_EXPIRED, useValue: mockIsExpired },
        { provide: PARSE_ERROR, useValue: mockParseError },
        {
          provide: GamesApiService,
          useValue: {
            getGames: vi.fn(),
            getGame: vi.fn(),
            getRandomGame: vi.fn(),
            getPlayers: vi.fn(),
            getTournaments: vi.fn(),
            getSummary: vi.fn(),
          },
        },
      ],
    });

    effects = TestBed.inject(GamesEffects);
    gamesApiService = TestBed.inject(GamesApiService) as Mocked<GamesApiService>;
    store = TestBed.inject(MockStore);

    store.overrideSelector(GamesSelectors.selectQuery, INITIAL_GAMES_QUERY);
    store.overrideSelector(GamesSelectors.selectLastFilteredFetch, null);
    store.overrideSelector(GamesSelectors.selectLastReferenceFetch, null);
    mockParseError.mockImplementation(() => mockError);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchFilteredGames$', () => {
    it('should fetch the games for the current query', () =>
      withDone(done => {
        gamesApiService.getGames.mockReturnValue(
          of({ data: { items: MOCK_GAMES, filteredCount: 3, totalCount: 9119 } }),
        );

        actions$.next(GamesActions.fetchFilteredGamesRequested());

        effects.fetchFilteredGames$.subscribe(action => {
          expect(gamesApiService.getGames).toHaveBeenCalledWith(INITIAL_GAMES_QUERY);
          expect(action).toEqual(
            GamesActions.fetchFilteredGamesSucceeded({
              games: MOCK_GAMES,
              filteredCount: 3,
            }),
          );
          done();
        });
      }));

    it('should report a failed fetch', () =>
      withDone(done => {
        gamesApiService.getGames.mockReturnValue(throwError(() => mockError));

        actions$.next(GamesActions.fetchFilteredGamesRequested());

        effects.fetchFilteredGames$.subscribe(action => {
          expect(action).toEqual(
            GamesActions.fetchFilteredGamesFailed({ error: mockError }),
          );
          done();
        });
      }));
  });

  describe('refetchFilteredGames$', () => {
    it('should fetch whenever the query changes', () =>
      withDone(done => {
        actions$.next(GamesActions.queryChanged({ query: INITIAL_GAMES_QUERY }));

        effects.refetchFilteredGames$.subscribe(action => {
          expect(action).toEqual(GamesActions.fetchFilteredGamesRequested());
          done();
        });
      }));

    it('should fetch again on refresh once results have been shown', () =>
      withDone(done => {
        store.overrideSelector(
          GamesSelectors.selectLastFilteredFetch,
          '2026-01-15T10:00:00.000Z',
        );
        store.refreshState();

        actions$.next(AppActions.refreshAppRequested());

        effects.refetchFilteredGames$.subscribe(action => {
          expect(action).toEqual(GamesActions.fetchFilteredGamesRequested());
          done();
        });
      }));

    it('should not fetch on refresh before any results have been shown', () => {
      const results: Action[] = [];
      effects.refetchFilteredGames$.subscribe(action => results.push(action));

      actions$.next(AppActions.refreshAppRequested());

      expect(results).toEqual([]);
    });
  });

  describe('fetchGame$', () => {
    it('should fetch the game', () =>
      withDone(done => {
        gamesApiService.getGame.mockReturnValue(of({ data: MOCK_GAMES[1] }));

        actions$.next(GamesActions.fetchGameRequested({ gameId: MOCK_GAMES[1].id }));

        effects.fetchGame$.subscribe(action => {
          expect(gamesApiService.getGame).toHaveBeenCalledWith(MOCK_GAMES[1].id);
          expect(action).toEqual(
            GamesActions.fetchGameSucceeded({ game: MOCK_GAMES[1] }),
          );
          done();
        });
      }));

    it('should report a failed fetch', () =>
      withDone(done => {
        gamesApiService.getGame.mockReturnValue(throwError(() => mockError));

        actions$.next(GamesActions.fetchGameRequested({ gameId: 'unknown' }));

        effects.fetchGame$.subscribe(action => {
          expect(action).toEqual(GamesActions.fetchGameFailed({ error: mockError }));
          done();
        });
      }));
  });

  describe('fetchArchiveReference$', () => {
    it('should fetch the players, tournaments and summary together', () =>
      withDone(done => {
        gamesApiService.getPlayers.mockReturnValue(of({ data: MOCK_ARCHIVE_PLAYERS }));
        gamesApiService.getTournaments.mockReturnValue(of({ data: MOCK_TOURNAMENTS }));
        gamesApiService.getSummary.mockReturnValue(of({ data: MOCK_GAMES_SUMMARY }));

        actions$.next(GamesActions.fetchArchiveReferenceRequested());

        effects.fetchArchiveReference$.subscribe(action => {
          expect(action).toEqual(
            GamesActions.fetchArchiveReferenceSucceeded({
              players: MOCK_ARCHIVE_PLAYERS,
              tournaments: MOCK_TOURNAMENTS,
              summary: MOCK_GAMES_SUMMARY,
            }),
          );
          done();
        });
      }));

    it('should report the failure when any part fails', () =>
      withDone(done => {
        gamesApiService.getPlayers.mockReturnValue(of({ data: MOCK_ARCHIVE_PLAYERS }));
        gamesApiService.getTournaments.mockReturnValue(throwError(() => mockError));
        gamesApiService.getSummary.mockReturnValue(of({ data: MOCK_GAMES_SUMMARY }));

        actions$.next(GamesActions.fetchArchiveReferenceRequested());

        effects.fetchArchiveReference$.subscribe(action => {
          expect(action).toEqual(
            GamesActions.fetchArchiveReferenceFailed({ error: mockError }),
          );
          done();
        });
      }));
  });

  describe('refetchArchiveReference$', () => {
    it('should fetch the reference data when the archives open without it', () =>
      withDone(done => {
        mockIsExpired.mockReturnValue(true);

        actions$.next(navigatedTo('/game-archives?year=1994'));

        effects.refetchArchiveReference$.subscribe(action => {
          expect(action).toEqual(GamesActions.fetchArchiveReferenceRequested());
          done();
        });
      }));

    it('should leave fresh reference data alone', () => {
      mockIsExpired.mockReturnValue(false);
      const results: Action[] = [];
      effects.refetchArchiveReference$.subscribe(action => results.push(action));

      actions$.next(navigatedTo('/game-archives'));

      expect(results).toEqual([]);
    });

    it('should ignore other pages', () => {
      mockIsExpired.mockReturnValue(true);
      const results: Action[] = [];
      effects.refetchArchiveReference$.subscribe(action => results.push(action));

      actions$.next(navigatedTo('/schedule'));

      expect(results).toEqual([]);
    });
  });

  describe('refetchArchiveReferenceOnRefresh$', () => {
    it('should fetch the reference data again on refresh once it has been shown', () =>
      withDone(done => {
        store.overrideSelector(
          GamesSelectors.selectLastReferenceFetch,
          '2026-01-15T10:00:00.000Z',
        );
        store.refreshState();

        actions$.next(AppActions.refreshAppRequested());

        effects.refetchArchiveReferenceOnRefresh$.subscribe(action => {
          expect(action).toEqual(GamesActions.fetchArchiveReferenceRequested());
          done();
        });
      }));

    it('should not fetch on refresh before the archives have been opened', () => {
      const results: Action[] = [];
      effects.refetchArchiveReferenceOnRefresh$.subscribe(action => results.push(action));

      actions$.next(AppActions.refreshAppRequested());

      expect(results).toEqual([]);
    });
  });

  describe('openRandomGame$', () => {
    it('should store the game and hand its id back', () => {
      gamesApiService.getRandomGame.mockReturnValue(of({ data: MOCK_GAMES[2] }));
      const results: Action[] = [];
      effects.openRandomGame$.subscribe(action => results.push(action));

      actions$.next(GamesActions.randomGameRequested());

      expect(results).toEqual([
        GamesActions.fetchGameSucceeded({ game: MOCK_GAMES[2] }),
        GamesActions.randomGamePicked({ gameId: MOCK_GAMES[2].id }),
      ]);
    });

    it('should report a failure', () =>
      withDone(done => {
        gamesApiService.getRandomGame.mockReturnValue(throwError(() => mockError));

        actions$.next(GamesActions.randomGameRequested());

        effects.openRandomGame$.subscribe(action => {
          expect(action).toEqual(GamesActions.randomGameFailed({ error: mockError }));
          done();
        });
      }));
  });
});
