import { provideMockActions } from '@ngrx/effects/testing';
import { Action } from '@ngrx/store';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { BehaviorSubject, Subject } from 'rxjs';

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Params, Router, provideRouter } from '@angular/router';

import { ARCHIVE_SIZING } from '@app/constants/game-archive-sizing';
import {
  DIE_ROLL_FRAMES,
  DIE_ROLL_INTERVAL,
  FIGURE_COUNT_UP_DURATION,
  INITIAL_GAMES_QUERY,
  PLACEHOLDER_GAME,
} from '@app/constants/games';
import {
  MOCK_ARCHIVE_PLAYERS,
  MOCK_GAMES,
  MOCK_GAMES_SUMMARY,
  MOCK_TOURNAMENTS,
} from '@app/mocks/games.mock';
import { MetaAndTitleService } from '@app/services';
import { GamesActions, GamesSelectors } from '@app/store/games';
import { playerName, query, queryAll, queryTextContent } from '@app/utils';

import { GameArchivesPageComponent, GameRow } from './game-archives-page.component';

describe('GameArchivesPageComponent', () => {
  let fixture: ComponentFixture<GameArchivesPageComponent>;
  let component: GameArchivesPageComponent;
  let router: Router;
  let store: MockStore;

  let actions$: Subject<Action>;
  let dispatchSpy: MockInstance;
  let navigateSpy: MockInstance;
  let queryParams: BehaviorSubject<Params>;

  const loadedQuery = {
    ...INITIAL_GAMES_QUERY,
    filters: { ...INITIAL_GAMES_QUERY.filters, tournament: 'Fall Open', year: 1994 },
  };

  beforeEach(async () => {
    actions$ = new Subject<Action>();
    queryParams = new BehaviorSubject<Params>({});

    await TestBed.configureTestingModule({
      imports: [GameArchivesPageComponent],
      providers: [
        provideMockActions(() => actions$),
        provideMockStore(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { queryParams: queryParams.asObservable() },
        },
        {
          provide: MetaAndTitleService,
          useValue: { updateTitle: vi.fn(), updateDescription: vi.fn() },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(GameArchivesPageComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    store = TestBed.inject(MockStore);

    dispatchSpy = vi.spyOn(store, 'dispatch');
    navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    store.overrideSelector(GamesSelectors.selectQuery, loadedQuery);
    store.overrideSelector(GamesSelectors.selectFilteredGames, MOCK_GAMES);
    store.overrideSelector(GamesSelectors.selectFilteredCount, 3);
    store.overrideSelector(GamesSelectors.selectFilteredGamesStatus, 'loaded');
    store.overrideSelector(GamesSelectors.selectPlayers, MOCK_ARCHIVE_PLAYERS);
    store.overrideSelector(GamesSelectors.selectTournaments, MOCK_TOURNAMENTS);
    store.overrideSelector(GamesSelectors.selectSummary, MOCK_GAMES_SUMMARY);
    store.overrideSelector(GamesSelectors.selectReferenceStatus, 'loaded');
    store.refreshState();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('the URL', () => {
    it('should set the query from the URL', () => {
      queryParams.next({ tournament: 'Fall Open', year: '1994' });
      fixture.detectChanges();

      expect(dispatchSpy).toHaveBeenCalledWith(
        GamesActions.queryChanged({ query: loadedQuery }),
      );
    });

    it('should set the query once per distinct URL', () => {
      fixture.detectChanges();
      queryParams.next({});
      queryParams.next({ page: '2' });

      expect(
        dispatchSpy.mock.calls.filter(
          ([action]) => action.type === GamesActions.queryChanged.type,
        ),
      ).toHaveLength(2);
    });
  });

  describe('filters', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should offer the players by surname', () => {
      expect(component['playerOptions']().map(option => option.label)).toEqual([
        'Chen, Sasha',
        'Jung, H.',
        'Litchfield, Gerry',
        'Oraha, ',
      ]);
    });

    it('should show the chosen player in the player box', () => {
      store.overrideSelector(GamesSelectors.selectQuery, {
        ...loadedQuery,
        filters: { ...loadedQuery.filters, player: MOCK_GAMES[0].white.id },
      });
      store.refreshState();
      fixture.detectChanges();

      expect(component['playerText']()).toBe('Litchfield, Gerry');
    });

    it('should offer the sections and years of the chosen tournament', () => {
      expect(component['sectionOptions']().map(option => option.value)).toEqual([
        '',
        'U1600',
        'U1800',
      ]);
      expect(component['yearOptions']().map(option => option.value)).toEqual([
        '',
        '1994',
      ]);
    });

    it('should offer every year when no tournament is chosen', () => {
      store.overrideSelector(GamesSelectors.selectQuery, INITIAL_GAMES_QUERY);
      store.refreshState();
      fixture.detectChanges();

      expect(component['yearOptions']().map(option => option.value)).toEqual([
        '',
        '2023',
        '2022',
        '1994',
      ]);
    });

    it('should put a chosen player in the URL and start from the first page', () => {
      component.onPlayerSelected({
        value: MOCK_GAMES[0].white.id,
        label: 'Litchfield, Gerry',
      });

      expect(navigateSpy).toHaveBeenCalledWith([], {
        relativeTo: TestBed.inject(ActivatedRoute),
        queryParams: {
          player: MOCK_GAMES[0].white.id,
          tournament: 'Fall Open',
          year: 1994,
        },
      });
    });

    it('should clear the player filter when the player box is emptied', () => {
      store.overrideSelector(GamesSelectors.selectQuery, {
        ...loadedQuery,
        filters: { ...loadedQuery.filters, player: MOCK_GAMES[0].white.id },
      });
      store.refreshState();

      component.onPlayerTyped('');

      expect(navigateSpy).toHaveBeenCalledWith([], {
        relativeTo: TestBed.inject(ActivatedRoute),
        queryParams: { tournament: 'Fall Open', year: 1994 },
      });
    });

    it('should not touch the URL while a name is being typed', () => {
      component.onPlayerTyped('Lit');

      expect(component['playerText']()).toBe('Lit');
      expect(navigateSpy).not.toHaveBeenCalled();
    });

    it('should drop the section when the tournament changes', () => {
      store.overrideSelector(GamesSelectors.selectQuery, {
        ...loadedQuery,
        filters: { ...loadedQuery.filters, section: 'U1800' },
      });
      store.refreshState();

      component.onTournamentChanged('Club Championship');

      expect(navigateSpy).toHaveBeenCalledWith([], {
        relativeTo: TestBed.inject(ActivatedRoute),
        queryParams: { tournament: 'Club Championship', year: 1994 },
      });
    });

    it('should put the year and result in the URL', () => {
      component.onYearChanged('2023');
      component.onResultChanged('1-0');

      expect(navigateSpy).toHaveBeenNthCalledWith(1, [], {
        relativeTo: TestBed.inject(ActivatedRoute),
        queryParams: { tournament: 'Fall Open', year: 2023 },
      });
      expect(navigateSpy).toHaveBeenNthCalledWith(2, [], {
        relativeTo: TestBed.inject(ActivatedRoute),
        queryParams: { tournament: 'Fall Open', year: 1994, result: '1-0' },
      });
    });

    it('should clear every filter', () => {
      component.onClearFilters();

      expect(navigateSpy).toHaveBeenCalledWith([], {
        relativeTo: TestBed.inject(ActivatedRoute),
        queryParams: {},
      });
    });

    it('should only offer to clear filters while some are set', () => {
      expect(component['hasFilters']()).toBe(true);

      store.overrideSelector(GamesSelectors.selectQuery, INITIAL_GAMES_QUERY);
      store.refreshState();

      expect(component['hasFilters']()).toBe(false);
    });
  });

  describe('sorting and paging', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should reflect the query in the table sort', () => {
      expect(component['sortState']()).toEqual({ column: 'date', direction: 'desc' });
    });

    it('should sort on the server from the first page', () => {
      component.onSorted({ column: 'moves', direction: 'asc' });

      expect(navigateSpy).toHaveBeenCalledWith([], {
        relativeTo: TestBed.inject(ActivatedRoute),
        queryParams: { tournament: 'Fall Open', year: 1994, sort: 'moves', order: 'asc' },
      });
    });

    it('should fall back to the default sort when a column is unsorted', () => {
      component.onSorted({ column: 'moves', direction: null });

      expect(navigateSpy).toHaveBeenCalledWith([], {
        relativeTo: TestBed.inject(ActivatedRoute),
        queryParams: { tournament: 'Fall Open', year: 1994 },
      });
    });

    it('should page on the server', () => {
      component.onPageChanged({ page: 3, pageSize: 50 });

      expect(navigateSpy).toHaveBeenCalledWith([], {
        relativeTo: TestBed.inject(ActivatedRoute),
        queryParams: { tournament: 'Fall Open', year: 1994, size: 50, page: 3 },
      });
    });
  });

  describe('the archive figures', () => {
    const figureTexts = () =>
      queryAll(fixture.debugElement, '.figures .figure').map(
        figure =>
          `${queryTextContent(figure, '.figure__value')} ${queryTextContent(figure, '.figure__label')}`,
      );

    // The count starts as the page initialises, so the timers are faked before that
    beforeEach(() => {
      vi.useFakeTimers();
      fixture.detectChanges();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should start every figure from nothing', () => {
      expect(figureTexts()).toEqual(['0 games', '0 years', '0 players', '0 tournaments']);
    });

    it('should count the figures up to their amounts over three seconds', () => {
      vi.advanceTimersByTime(FIGURE_COUNT_UP_DURATION / 2);
      fixture.detectChanges();
      const halfway = component['figures']().map(figure => figure.value);

      vi.advanceTimersByTime(FIGURE_COUNT_UP_DURATION / 2);
      fixture.detectChanges();

      expect(halfway[0]).toBeGreaterThan(0);
      expect(halfway[0]).toBeLessThan(9119);
      expect(figureTexts()).toEqual([
        '9,119 games',
        '53 years',
        '989 players',
        '189 tournaments',
      ]);
    });
  });

  describe('the random game', () => {
    const rollDuration = DIE_ROLL_FRAMES * DIE_ROLL_INTERVAL;

    // The count starts as the page initialises, so the timers are faked before that
    beforeEach(() => {
      vi.useFakeTimers();
      fixture.detectChanges();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should roll the die before opening the game that was picked', () => {
      query(fixture.debugElement, '.intro__random').triggerEventHandler('clicked');
      actions$.next(GamesActions.randomGamePicked({ gameId: MOCK_GAMES[2].id }));

      vi.advanceTimersByTime(rollDuration - 1);

      expect(dispatchSpy).toHaveBeenCalledWith(GamesActions.randomGameRequested());
      expect(navigateSpy).not.toHaveBeenCalled();

      vi.advanceTimersByTime(1);

      expect(navigateSpy).toHaveBeenCalledWith(['/game-archives', MOCK_GAMES[2].id]);
    });

    it('should swap the label for a loading spinner while the die rolls', () => {
      query(fixture.debugElement, '.intro__random').triggerEventHandler('clicked');
      fixture.detectChanges();

      expect(query(fixture.debugElement, '.intro__random-label--rolling')).toBeTruthy();
    });

    it('should show another face of the die with every frame', () => {
      const before = component['randomIcon']();

      query(fixture.debugElement, '.intro__random').triggerEventHandler('clicked');
      vi.advanceTimersByTime(DIE_ROLL_INTERVAL);

      expect(component['randomIcon']()).not.toBe(before);
    });

    it('should ignore a second press while the die is rolling', () => {
      query(fixture.debugElement, '.intro__random').triggerEventHandler('clicked');
      query(fixture.debugElement, '.intro__random').triggerEventHandler('clicked');

      expect(
        dispatchSpy.mock.calls.filter(
          ([action]) => action.type === GamesActions.randomGameRequested.type,
        ),
      ).toHaveLength(1);
    });

    it('should stop rolling without opening anything when no game was picked', () => {
      query(fixture.debugElement, '.intro__random').triggerEventHandler('clicked');
      actions$.next(
        GamesActions.randomGameFailed({
          error: { name: 'LCCError', message: 'Failed' },
        }),
      );

      vi.advanceTimersByTime(rollDuration);

      expect(component['rolling']()).toBe(false);
      expect(navigateSpy).not.toHaveBeenCalled();
    });
  });

  describe('template rendering', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should list the games', () => {
      const rows = queryAll(
        fixture.debugElement,
        '.ea-data-table__body .ea-data-table__row',
      );

      expect(rows).toHaveLength(3);
      expect(queryTextContent(rows[0], '.games__date')).toBe('December 7, 2023');
      expect(
        queryAll(rows[0], 'lcc-member-link').map(link => link.componentInstance.name()),
      ).toEqual(['Sasha Chen', 'Gerry Litchfield']);
      expect(queryTextContent(rows[0], '.games__result')).toBe('½-½');
      expect(queryTextContent(rows[0], '.games__event')).toBe('Club Championship');
      expect(queryTextContent(rows[0], '.games__section')).toBe('(A1)');
      expect(queryTextContent(rows[0], '.games__eco')).toBe('D02');
      expect(queryTextContent(rows[1], '.games__date')).toBe('October 1994');
      expect(queryTextContent(rows[1], '.games__result')).toBe('1-0');
      expect(queryTextContent(rows[2], '.games__event')).toBe('Unknown event');
    });

    it('should size the columns by the widest content in the archive', () => {
      const sizingRows: GameRow[] = query(
        fixture.debugElement,
        'ea-data-table',
      ).componentInstance.sizingRows();

      const [widestPlayer] = ARCHIVE_SIZING.players;
      const [widestEvent] = ARCHIVE_SIZING.events;
      const [widestOpening] = ARCHIVE_SIZING.openings;

      expect(sizingRows[0].dateLabel).toBe('September 30, 2000');
      expect(sizingRows[0].whiteName).toBe(
        playerName({ ...PLACEHOLDER_GAME.white, ...widestPlayer }),
      );
      expect(sizingRows[0].game?.tournament).toBe(widestEvent.tournament);
      expect(sizingRows[0].game?.section).toBe(widestEvent.section);
      expect(sizingRows[0].game?.opening).toBe(widestOpening.name);
      expect(sizingRows[0].moves).toBe(ARCHIVE_SIZING.longestGame);
      expect(
        queryAll(fixture.debugElement, '.ea-data-table__sizing .ea-data-table__row'),
      ).toHaveLength(sizingRows.length);
    });

    it('should render the failure panel when the reference data fails to load', () => {
      store.overrideSelector(GamesSelectors.selectReferenceStatus, 'failed');
      store.refreshState();
      fixture.detectChanges();

      expect(query(fixture.debugElement, 'lcc-load-failed')).toBeTruthy();
      expect(query(fixture.debugElement, 'ea-data-table')).toBeFalsy();
    });

    it('should link every row to its game', () => {
      const links = queryAll(
        fixture.debugElement,
        '.ea-data-table__body .ea-data-table__row-link',
      );

      expect(links).toHaveLength(3 * 7);
      expect(links[0].attributes['href']).toBe(`/game-archives/${MOCK_GAMES[1].id}`);
    });

    it('should open a game when its row is chosen', () => {
      query(
        fixture.debugElement,
        '.ea-data-table__body .ea-data-table__row',
      ).triggerEventHandler('click');

      expect(navigateSpy).toHaveBeenCalledWith(['/game-archives', MOCK_GAMES[1].id]);
    });

    it('should keep the paginator total while another page loads', () => {
      store.overrideSelector(GamesSelectors.selectFilteredGames, []);
      store.overrideSelector(GamesSelectors.selectFilteredGamesStatus, 'loading');
      store.refreshState();
      fixture.detectChanges();

      const paginator = query(fixture.debugElement, 'ea-paginator').componentInstance;

      expect(paginator.totalItems()).toBe(3);
      expect(paginator.showRangeLabel()).toBe(true);
    });

    it('should hold the paginator range back until the first count is known', () => {
      store.overrideSelector(GamesSelectors.selectFilteredGames, []);
      store.overrideSelector(GamesSelectors.selectFilteredCount, null);
      store.overrideSelector(GamesSelectors.selectFilteredGamesStatus, 'loading');
      store.refreshState();
      fixture.detectChanges();

      expect(
        query(fixture.debugElement, 'ea-paginator').componentInstance.showRangeLabel(),
      ).toBe(false);
    });

    it('should show the paginator for the filtered games', () => {
      const paginator = query(fixture.debugElement, 'ea-paginator').componentInstance;

      expect(paginator.totalItems()).toBe(3);
      expect(paginator.page()).toBe(1);
      expect(paginator.pageSize()).toBe(25);
    });

    describe('while the games load', () => {
      beforeEach(() => {
        store.overrideSelector(GamesSelectors.selectFilteredGames, []);
        store.overrideSelector(GamesSelectors.selectFilteredGamesStatus, 'loading');
        store.refreshState();
        fixture.detectChanges();
      });

      it('should render a skeleton row for each game on the page', () => {
        const rows = queryAll(
          fixture.debugElement,
          '.ea-data-table__body .ea-data-table__row',
        );

        expect(rows).toHaveLength(25);
        expect(queryAll(rows[0], 'lcc-text-skeleton')).toHaveLength(7);
      });

      it('should not open skeleton rows', () => {
        query(
          fixture.debugElement,
          '.ea-data-table__body .ea-data-table__row',
        ).triggerEventHandler('click');

        expect(navigateSpy).not.toHaveBeenCalled();
      });
    });

    it('should keep the games on screen while they refresh', () => {
      store.overrideSelector(GamesSelectors.selectFilteredGamesStatus, 'loading');
      store.refreshState();
      fixture.detectChanges();

      expect(
        queryAll(fixture.debugElement, '.ea-data-table__body .ea-data-table__row'),
      ).toHaveLength(3);
      expect(query(fixture.debugElement, 'lcc-text-skeleton')).toBeFalsy();
    });

    it('should say when no games match', () => {
      store.overrideSelector(GamesSelectors.selectFilteredGames, []);
      store.overrideSelector(GamesSelectors.selectFilteredCount, 0);
      store.refreshState();
      fixture.detectChanges();

      expect(queryTextContent(fixture.debugElement, '.ea-data-table__cell--empty')).toBe(
        'No games match these filters.',
      );
    });

    describe('when the games fail to load', () => {
      beforeEach(() => {
        store.overrideSelector(GamesSelectors.selectFilteredGamesStatus, 'failed');
        store.refreshState();
        fixture.detectChanges();
      });

      it('should render a failure panel in place of the table', () => {
        expect(query(fixture.debugElement, 'lcc-load-failed')).toBeTruthy();
        expect(query(fixture.debugElement, 'ea-data-table')).toBeFalsy();
      });

      it('should fetch the games again on retry', () => {
        dispatchSpy.mockClear();

        query(fixture.debugElement, 'lcc-load-failed').triggerEventHandler('retry');

        expect(dispatchSpy).toHaveBeenCalledTimes(1);
        expect(dispatchSpy).toHaveBeenCalledWith(
          GamesActions.fetchFilteredGamesRequested(),
        );
      });

      it('should also fetch the reference data again when that failed too', () => {
        store.overrideSelector(GamesSelectors.selectReferenceStatus, 'failed');
        store.refreshState();
        dispatchSpy.mockClear();

        query(fixture.debugElement, 'lcc-load-failed').triggerEventHandler('retry');

        expect(dispatchSpy).toHaveBeenCalledWith(
          GamesActions.fetchArchiveReferenceRequested(),
        );
      });
    });
  });
});
