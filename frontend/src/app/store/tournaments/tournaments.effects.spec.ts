import { provideMockActions } from '@ngrx/effects/testing';
import { routerNavigatedAction } from '@ngrx/router-store';
import { Action } from '@ngrx/store';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { ReplaySubject, of, throwError } from 'rxjs';

import { TestBed } from '@angular/core/testing';
import { NavigationEnd } from '@angular/router';

import {
  MOCK_MEMBER_TOURNAMENT_RESULTS,
  MOCK_TOURNAMENTS,
  MOCK_TOURNAMENT_SUMMARIES,
} from '@app/mocks/tournaments.mock';
import { LccError } from '@app/models';
import { TournamentsApiService } from '@app/services';
import { AppActions } from '@app/store/app';
import { IS_EXPIRED, PARSE_ERROR } from '@app/tokens';

import { TournamentsActions, TournamentsSelectors } from '.';
import { TournamentsEffects } from './tournaments.effects';

describe('TournamentsEffects', () => {
  let actions$: ReplaySubject<Action>;
  let effects: TournamentsEffects;
  let tournamentsApiService: Mocked<TournamentsApiService>;
  let store: MockStore;

  const mockIsExpired = vi.fn();
  const mockParseError = vi.fn();
  const mockError: LccError = { name: 'LCCError', message: 'Test error' };

  const navigatedTo = (url: string): Action & { payload: { event: NavigationEnd } } => ({
    type: routerNavigatedAction.type,
    payload: { event: new NavigationEnd(1, url, url) },
  });

  beforeEach(() => {
    actions$ = new ReplaySubject<Action>(1);

    TestBed.configureTestingModule({
      providers: [
        TournamentsEffects,
        provideMockActions(() => actions$),
        provideMockStore(),
        { provide: IS_EXPIRED, useValue: mockIsExpired },
        { provide: PARSE_ERROR, useValue: mockParseError },
        {
          provide: TournamentsApiService,
          useValue: {
            getTournaments: vi.fn(),
            getTournament: vi.fn(),
            getMemberTournaments: vi.fn(),
          },
        },
      ],
    });

    effects = TestBed.inject(TournamentsEffects);
    tournamentsApiService = TestBed.inject(
      TournamentsApiService,
    ) as Mocked<TournamentsApiService>;
    store = TestBed.inject(MockStore);

    store.overrideSelector(TournamentsSelectors.selectLastSummariesFetch, null);
    mockParseError.mockImplementation(() => mockError);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchTournaments$', () => {
    it('should fetch every tournament', () =>
      withDone(done => {
        tournamentsApiService.getTournaments.mockReturnValue(
          of({ data: MOCK_TOURNAMENT_SUMMARIES }),
        );

        actions$.next(TournamentsActions.fetchTournamentsRequested());

        effects.fetchTournaments$.subscribe(action => {
          expect(action).toEqual(
            TournamentsActions.fetchTournamentsSucceeded({
              summaries: MOCK_TOURNAMENT_SUMMARIES,
            }),
          );
          done();
        });
      }));

    it('should report a failed fetch', () =>
      withDone(done => {
        tournamentsApiService.getTournaments.mockReturnValue(throwError(() => mockError));

        actions$.next(TournamentsActions.fetchTournamentsRequested());

        effects.fetchTournaments$.subscribe(action => {
          expect(action).toEqual(
            TournamentsActions.fetchTournamentsFailed({ error: mockError }),
          );
          done();
        });
      }));
  });

  describe('refetchTournaments$', () => {
    it('should fetch on arriving at the archives once the summaries have expired', () =>
      withDone(done => {
        mockIsExpired.mockReturnValue(true);

        actions$.next(navigatedTo('/tournaments?year=2024'));

        effects.refetchTournaments$.subscribe(action => {
          expect(action).toEqual(TournamentsActions.fetchTournamentsRequested());
          done();
        });
      }));

    it('should not fetch while the summaries are fresh', () => {
      mockIsExpired.mockReturnValue(false);
      const results: Action[] = [];
      effects.refetchTournaments$.subscribe(action => results.push(action));

      actions$.next(navigatedTo('/tournaments'));

      expect(results).toEqual([]);
    });

    it('should not fetch on arriving anywhere else', () => {
      mockIsExpired.mockReturnValue(true);
      const results: Action[] = [];
      effects.refetchTournaments$.subscribe(action => results.push(action));

      actions$.next(navigatedTo('/tournaments/90'));
      actions$.next(navigatedTo('/game-archives'));

      expect(results).toEqual([]);
    });
  });

  describe('refetchTournamentsOnRefresh$', () => {
    it('should fetch again on refresh once the summaries have been shown', () =>
      withDone(done => {
        store.overrideSelector(
          TournamentsSelectors.selectLastSummariesFetch,
          '2026-01-15T10:00:00.000Z',
        );
        store.refreshState();

        actions$.next(AppActions.refreshAppRequested());

        effects.refetchTournamentsOnRefresh$.subscribe(action => {
          expect(action).toEqual(TournamentsActions.fetchTournamentsRequested());
          done();
        });
      }));

    it('should not fetch on refresh before the summaries have been shown', () => {
      const results: Action[] = [];
      effects.refetchTournamentsOnRefresh$.subscribe(action => results.push(action));

      actions$.next(AppActions.refreshAppRequested());

      expect(results).toEqual([]);
    });
  });

  describe('fetchTournament$', () => {
    it('should fetch the tournament', () =>
      withDone(done => {
        tournamentsApiService.getTournament.mockReturnValue(
          of({ data: MOCK_TOURNAMENTS[0] }),
        );

        actions$.next(
          TournamentsActions.fetchTournamentRequested({ tournamentNumber: 90 }),
        );

        effects.fetchTournament$.subscribe(action => {
          expect(tournamentsApiService.getTournament).toHaveBeenCalledWith(90);
          expect(action).toEqual(
            TournamentsActions.fetchTournamentSucceeded({
              tournament: MOCK_TOURNAMENTS[0],
            }),
          );
          done();
        });
      }));

    it('should report a failed fetch', () =>
      withDone(done => {
        tournamentsApiService.getTournament.mockReturnValue(throwError(() => mockError));

        actions$.next(
          TournamentsActions.fetchTournamentRequested({ tournamentNumber: 5 }),
        );

        effects.fetchTournament$.subscribe(action => {
          expect(action).toEqual(
            TournamentsActions.fetchTournamentFailed({ error: mockError }),
          );
          done();
        });
      }));
  });

  describe('fetchMemberTournaments$', () => {
    it("should fetch the member's results", () =>
      withDone(done => {
        tournamentsApiService.getMemberTournaments.mockReturnValue(
          of({ data: MOCK_MEMBER_TOURNAMENT_RESULTS }),
        );

        actions$.next(
          TournamentsActions.fetchMemberTournamentsRequested({ memberNumber: 2 }),
        );

        effects.fetchMemberTournaments$.subscribe(action => {
          expect(tournamentsApiService.getMemberTournaments).toHaveBeenCalledWith(2);
          expect(action).toEqual(
            TournamentsActions.fetchMemberTournamentsSucceeded({
              memberNumber: 2,
              results: MOCK_MEMBER_TOURNAMENT_RESULTS,
            }),
          );
          done();
        });
      }));

    it('should report a failed fetch', () =>
      withDone(done => {
        tournamentsApiService.getMemberTournaments.mockReturnValue(
          throwError(() => mockError),
        );

        actions$.next(
          TournamentsActions.fetchMemberTournamentsRequested({ memberNumber: 2 }),
        );

        effects.fetchMemberTournaments$.subscribe(action => {
          expect(action).toEqual(
            TournamentsActions.fetchMemberTournamentsFailed({ error: mockError }),
          );
          done();
        });
      }));
  });
});
