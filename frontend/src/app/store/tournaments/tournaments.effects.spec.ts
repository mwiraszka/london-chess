import { provideMockActions } from '@ngrx/effects/testing';
import { routerNavigatedAction } from '@ngrx/router-store';
import { Action } from '@ngrx/store';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { ReplaySubject, firstValueFrom, of, throwError } from 'rxjs';

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { NavigationEnd } from '@angular/router';

import { INITIAL_TOURNAMENT_FORM_DATA } from '@app/constants/tournaments';
import {
  MOCK_MEMBER_TOURNAMENT_RESULTS,
  MOCK_TOURNAMENTS,
  MOCK_TOURNAMENT_SUMMARIES,
  MOCK_UPCOMING_TOURNAMENT,
} from '@app/mocks/tournaments.mock';
import { LccError, TournamentFormData, User } from '@app/models';
import { TournamentsApiService, UserService } from '@app/services';
import { AppActions } from '@app/store/app';
import { IS_EXPIRED, PARSE_ERROR } from '@app/tokens';

import { TournamentsActions, TournamentsSelectors } from '.';
import { TournamentsEffects } from './tournaments.effects';
import { initialState, tournamentsAdapter } from './tournaments.reducer';

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
            addTournament: vi.fn(),
            updateTournament: vi.fn(),
            deleteTournament: vi.fn(),
            register: vi.fn(),
            withdraw: vi.fn(),
          },
        },
        { provide: UserService, useValue: { memberNumber: signal(100) } },
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
    store.resetSelectors();
    vi.clearAllMocks();
  });

  describe('fetchTournaments$', () => {
    it('should fetch every tournament', async () => {
      tournamentsApiService.getTournaments.mockReturnValue(
        of({ data: MOCK_TOURNAMENT_SUMMARIES }),
      );

      actions$.next(TournamentsActions.fetchTournamentsRequested());
      const action = await firstValueFrom(effects.fetchTournaments$);

      expect(action).toEqual(
        TournamentsActions.fetchTournamentsSucceeded({
          summaries: MOCK_TOURNAMENT_SUMMARIES,
        }),
      );
    });

    it('should report a failed fetch', async () => {
      tournamentsApiService.getTournaments.mockReturnValue(throwError(() => mockError));

      actions$.next(TournamentsActions.fetchTournamentsRequested());
      const action = await firstValueFrom(effects.fetchTournaments$);

      expect(action).toEqual(
        TournamentsActions.fetchTournamentsFailed({ error: mockError }),
      );
    });
  });

  describe('refetchTournaments$', () => {
    it('should fetch on arriving at the archives once the summaries have expired', async () => {
      mockIsExpired.mockReturnValue(true);

      actions$.next(navigatedTo('/tournaments?year=2024'));
      const action = await firstValueFrom(effects.refetchTournaments$);

      expect(action).toEqual(TournamentsActions.fetchTournamentsRequested());
    });

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
    it('should fetch again on refresh once the summaries have been shown', async () => {
      store.overrideSelector(
        TournamentsSelectors.selectLastSummariesFetch,
        '2026-01-15T10:00:00.000Z',
      );
      store.refreshState();

      actions$.next(AppActions.refreshAppRequested());
      const action = await firstValueFrom(effects.refetchTournamentsOnRefresh$);

      expect(action).toEqual(TournamentsActions.fetchTournamentsRequested());
    });

    it('should not fetch on refresh before the summaries have been shown', () => {
      const results: Action[] = [];
      effects.refetchTournamentsOnRefresh$.subscribe(action => results.push(action));

      actions$.next(AppActions.refreshAppRequested());

      expect(results).toEqual([]);
    });
  });

  describe('fetchTournament$', () => {
    it('should fetch the tournament', async () => {
      tournamentsApiService.getTournament.mockReturnValue(
        of({ data: MOCK_TOURNAMENTS[0] }),
      );

      actions$.next(
        TournamentsActions.fetchTournamentRequested({ tournamentNumber: 90 }),
      );
      const action = await firstValueFrom(effects.fetchTournament$);

      expect(tournamentsApiService.getTournament).toHaveBeenCalledWith(90);
      expect(action).toEqual(
        TournamentsActions.fetchTournamentSucceeded({
          tournament: MOCK_TOURNAMENTS[0],
        }),
      );
    });

    it('should report a failed fetch', async () => {
      tournamentsApiService.getTournament.mockReturnValue(throwError(() => mockError));

      actions$.next(TournamentsActions.fetchTournamentRequested({ tournamentNumber: 5 }));
      const action = await firstValueFrom(effects.fetchTournament$);

      expect(action).toEqual(
        TournamentsActions.fetchTournamentFailed({ error: mockError }),
      );
    });
  });

  describe('fetchMemberTournaments$', () => {
    it("should fetch the member's results", async () => {
      tournamentsApiService.getMemberTournaments.mockReturnValue(
        of({ data: MOCK_MEMBER_TOURNAMENT_RESULTS }),
      );

      actions$.next(
        TournamentsActions.fetchMemberTournamentsRequested({ memberNumber: 2 }),
      );
      const action = await firstValueFrom(effects.fetchMemberTournaments$);

      expect(tournamentsApiService.getMemberTournaments).toHaveBeenCalledWith(2);
      expect(action).toEqual(
        TournamentsActions.fetchMemberTournamentsSucceeded({
          memberNumber: 2,
          results: MOCK_MEMBER_TOURNAMENT_RESULTS,
        }),
      );
    });

    it('should report a failed fetch', async () => {
      tournamentsApiService.getMemberTournaments.mockReturnValue(
        throwError(() => mockError),
      );

      actions$.next(
        TournamentsActions.fetchMemberTournamentsRequested({ memberNumber: 2 }),
      );
      const action = await firstValueFrom(effects.fetchMemberTournaments$);

      expect(action).toEqual(
        TournamentsActions.fetchMemberTournamentsFailed({ error: mockError }),
      );
    });
  });

  describe('saving tournaments', () => {
    const admin: User = {
      id: 'user_admin',
      firstName: 'Ada',
      lastName: 'Admin',
      email: 'ada@example.com',
      isAdmin: true,
    };
    const draft: TournamentFormData = {
      ...INITIAL_TOURNAMENT_FORM_DATA,
      name: 'Winter Blitz',
      date: '2026-12-03',
    };

    const number = MOCK_UPCOMING_TOURNAMENT.number;

    beforeEach(() => {
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(new Date('2026-09-27T12:00:00.000Z'));
      store.setState({
        authState: { user: admin },
        tournamentsState: tournamentsAdapter.setAll([MOCK_UPCOMING_TOURNAMENT], {
          ...initialState,
          formData: { [number]: draft },
          newTournamentFormData: draft,
        }),
      });
    });

    afterEach(() => vi.useRealTimers());

    it('should add the draft of a new tournament credited to the admin', async () => {
      tournamentsApiService.addTournament.mockReturnValue(of({ data: 185 }));

      actions$.next(TournamentsActions.addTournamentRequested());
      const action = await firstValueFrom(effects.addTournament$);

      expect(tournamentsApiService.addTournament).toHaveBeenCalledWith({
        ...draft,
        modificationInfo: {
          createdBy: 'Ada Admin',
          createdByNumber: 100,
          dateCreated: '2026-09-27T12:00:00.000Z',
          lastEditedBy: 'Ada Admin',
          lastEditedByNumber: 100,
          dateLastEdited: '2026-09-27T12:00:00.000Z',
        },
      });
      expect(action).toEqual(
        TournamentsActions.addTournamentSucceeded({
          tournamentNumber: 185,
          tournamentName: 'Winter Blitz',
        }),
      );
    });

    it('should update a tournament, keeping who created it', async () => {
      tournamentsApiService.updateTournament.mockReturnValue(of({ data: number }));

      actions$.next(
        TournamentsActions.updateTournamentRequested({ tournamentNumber: number }),
      );
      const action = await firstValueFrom(effects.updateTournament$);

      expect(tournamentsApiService.updateTournament).toHaveBeenCalledWith(number, {
        ...draft,
        modificationInfo: expect.objectContaining({
          createdBy: MOCK_UPCOMING_TOURNAMENT.modificationInfo?.createdBy,
          lastEditedBy: 'Ada Admin',
        }),
      });
      expect(action).toEqual(
        TournamentsActions.updateTournamentSucceeded({
          tournamentNumber: number,
          tournamentName: 'Winter Blitz',
        }),
      );
    });

    it('should report a failed save', async () => {
      tournamentsApiService.addTournament.mockReturnValue(throwError(() => mockError));

      actions$.next(TournamentsActions.addTournamentRequested());
      const action = await firstValueFrom(effects.addTournament$);

      expect(action).toEqual(
        TournamentsActions.addTournamentFailed({ error: mockError }),
      );
    });

    it('should delete a tournament', async () => {
      tournamentsApiService.deleteTournament.mockReturnValue(of({ data: 90 }));

      actions$.next(
        TournamentsActions.deleteTournamentRequested({
          tournamentNumber: 90,
          tournamentName: 'Fall Active',
        }),
      );
      const action = await firstValueFrom(effects.deleteTournament$);

      expect(action).toEqual(
        TournamentsActions.deleteTournamentSucceeded({
          tournamentNumber: 90,
          tournamentName: 'Fall Active',
        }),
      );
    });
  });

  describe('registration', () => {
    const request = { tournamentNumber: 184, tournamentName: 'Fall Rapid' };

    it('should register and pass on the latest registrants', async () => {
      tournamentsApiService.register.mockReturnValue(
        of({ data: MOCK_UPCOMING_TOURNAMENT.registrants }),
      );

      actions$.next(TournamentsActions.registrationRequested(request));
      const action = await firstValueFrom(effects.register$);

      expect(action).toEqual(
        TournamentsActions.registrationSucceeded({
          ...request,
          registrants: MOCK_UPCOMING_TOURNAMENT.registrants,
        }),
      );
    });

    it('should report a refused registration', async () => {
      tournamentsApiService.register.mockReturnValue(throwError(() => mockError));

      actions$.next(TournamentsActions.registrationRequested(request));
      const action = await firstValueFrom(effects.register$);

      expect(action).toEqual(TournamentsActions.registrationFailed({ error: mockError }));
    });

    it('should withdraw and pass on the latest registrants', async () => {
      tournamentsApiService.withdraw.mockReturnValue(of({ data: [] }));

      actions$.next(TournamentsActions.withdrawalRequested(request));
      const action = await firstValueFrom(effects.withdraw$);

      expect(action).toEqual(
        TournamentsActions.withdrawalSucceeded({ ...request, registrants: [] }),
      );
    });

    it('should report a refused withdrawal', async () => {
      tournamentsApiService.withdraw.mockReturnValue(throwError(() => mockError));

      actions$.next(TournamentsActions.withdrawalRequested(request));
      const action = await firstValueFrom(effects.withdraw$);

      expect(action).toEqual(TournamentsActions.withdrawalFailed({ error: mockError }));
    });
  });
});
