import { TooltipDirective } from '@eagami/ui';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { BehaviorSubject } from 'rxjs';

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Params, Router, provideRouter } from '@angular/router';

import { FIGURE_COUNT_UP_DURATION, INITIAL_GAMES_QUERY } from '@app/constants/games';
import {
  MOCK_ARCHIVE_PLAYERS,
  MOCK_ARCHIVE_TOURNAMENTS,
  MOCK_GAMES,
  MOCK_GAMES_SUMMARY,
} from '@app/mocks/games.mock';
import { KEEP_SCROLL, MetaAndTitleService } from '@app/services';
import { GamesActions, GamesSelectors } from '@app/store/games';
import { query, queryAll, queryTextContent } from '@app/utils';

import { GameArchivesPageComponent, GameRow } from './game-archives-page.component';

describe('GameArchivesPageComponent', () => {
  let fixture: ComponentFixture<GameArchivesPageComponent>;
  let component: GameArchivesPageComponent;
  let router: Router;
  let store: MockStore;

  let dispatchSpy: MockInstance;
  let navigateSpy: MockInstance;
  let queryParams: BehaviorSubject<Params>;

  const loadedQuery = {
    ...INITIAL_GAMES_QUERY,
    filters: { ...INITIAL_GAMES_QUERY.filters, year: 1994 },
  };

  beforeEach(async () => {
    queryParams = new BehaviorSubject<Params>({ year: '1994' });

    await TestBed.configureTestingModule({
      imports: [GameArchivesPageComponent],
      providers: [
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
    store.overrideSelector(GamesSelectors.selectIsFetchingFiltered, false);
    store.overrideSelector(GamesSelectors.selectPlayers, MOCK_ARCHIVE_PLAYERS);
    store.overrideSelector(GamesSelectors.selectTournaments, MOCK_ARCHIVE_TOURNAMENTS);
    store.overrideSelector(GamesSelectors.selectSummary, MOCK_GAMES_SUMMARY);
    store.overrideSelector(GamesSelectors.selectReferenceStatus, 'loaded');
    store.refreshState();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('the URL', () => {
    it('should set the query from the URL', () => {
      queryParams.next({ year: '1994' });
      fixture.detectChanges();

      expect(dispatchSpy).toHaveBeenCalledWith(
        GamesActions.queryChanged({ query: loadedQuery }),
      );
    });

    it('should set the query once per distinct URL', () => {
      fixture.detectChanges();
      queryParams.next({ year: '1994' });
      queryParams.next({ page: '2' });

      expect(
        dispatchSpy.mock.calls.filter(
          ([action]) => action.type === GamesActions.queryChanged.type,
        ),
      ).toHaveLength(2);
    });

    it('should open a bare address at the remembered query', () => {
      queryParams.next({});

      fixture.detectChanges();

      expect(navigateSpy).toHaveBeenCalledWith([], {
        relativeTo: TestBed.inject(ActivatedRoute),
        info: KEEP_SCROLL,
        queryParams: { year: 1994 },
        replaceUrl: true,
      });
      expect(dispatchSpy).toHaveBeenCalledWith(
        GamesActions.queryChanged({ query: loadedQuery }),
      );
    });

    it('should leave a bare address alone when nothing is remembered', () => {
      store.overrideSelector(GamesSelectors.selectQuery, INITIAL_GAMES_QUERY);
      store.refreshState();
      queryParams.next({});

      fixture.detectChanges();

      expect(navigateSpy).not.toHaveBeenCalled();
      expect(dispatchSpy).toHaveBeenCalledWith(
        GamesActions.queryChanged({ query: INITIAL_GAMES_QUERY }),
      );
    });

    it('should follow an address over the remembered query', () => {
      queryParams.next({ year: '2023' });

      fixture.detectChanges();

      expect(navigateSpy).not.toHaveBeenCalled();
      expect(dispatchSpy).toHaveBeenCalledWith(
        GamesActions.queryChanged({
          query: { ...loadedQuery, filters: { ...loadedQuery.filters, year: 2023 } },
        }),
      );
    });

    it('should take a later bare address as it is', () => {
      fixture.detectChanges();

      queryParams.next({});

      expect(navigateSpy).not.toHaveBeenCalled();
      expect(dispatchSpy).toHaveBeenCalledWith(
        GamesActions.queryChanged({ query: INITIAL_GAMES_QUERY }),
      );
    });
  });

  describe('filters', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should offer the players by surname', () => {
      expect(component['playerOptions']().map(option => option.label)).toEqual([
        'Smith, Jane',
        'Roe, H.',
        'Doe, John',
        'Public, ',
      ]);
    });

    it('should show the chosen player in the player box', () => {
      store.overrideSelector(GamesSelectors.selectQuery, {
        ...loadedQuery,
        filters: { ...loadedQuery.filters, player: MOCK_GAMES[0].white.id },
      });
      store.refreshState();
      fixture.detectChanges();

      expect(component['playerText']()).toBe('Doe, John');
    });

    it('should offer every year in the archive', () => {
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
        label: 'Doe, John',
      });

      expect(navigateSpy).toHaveBeenCalledWith([], {
        relativeTo: TestBed.inject(ActivatedRoute),
        info: KEEP_SCROLL,
        queryParams: {
          player: MOCK_GAMES[0].white.id,
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
        info: KEEP_SCROLL,
        queryParams: { year: 1994 },
      });
    });

    it('should not touch the URL while a name is being typed', () => {
      component.onPlayerTyped('Lit');

      expect(component['playerText']()).toBe('Lit');
      expect(navigateSpy).not.toHaveBeenCalled();
    });

    it('should put the year and result in the URL', () => {
      component.onYearChanged('2023');
      component.onResultChanged('1-0');

      expect(navigateSpy).toHaveBeenNthCalledWith(1, [], {
        relativeTo: TestBed.inject(ActivatedRoute),
        info: KEEP_SCROLL,
        queryParams: { year: 2023 },
      });
      expect(navigateSpy).toHaveBeenNthCalledWith(2, [], {
        relativeTo: TestBed.inject(ActivatedRoute),
        info: KEEP_SCROLL,
        queryParams: { year: 1994, result: '1-0' },
      });
    });

    it('should clear every filter', () => {
      component.onClearFilters();

      expect(navigateSpy).toHaveBeenCalledWith([], {
        relativeTo: TestBed.inject(ActivatedRoute),
        info: KEEP_SCROLL,
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

    it('should offer every column of a game as a sort', () => {
      expect(
        component['columns']()
          .filter(column => column.sortable)
          .map(column => column.key),
      ).toEqual([
        'date',
        'whiteName',
        'result',
        'blackName',
        'event',
        'opening',
        'moves',
      ]);
    });

    it('should sort on the server by a player name', () => {
      component.onSorted({ column: 'whiteName', direction: 'asc' });

      expect(navigateSpy).toHaveBeenCalledWith([], {
        relativeTo: TestBed.inject(ActivatedRoute),
        info: KEEP_SCROLL,
        queryParams: { year: 1994, sort: 'white', order: 'asc' },
      });
    });

    it('should sort on the server from the first page', () => {
      component.onSorted({ column: 'moves', direction: 'asc' });

      expect(navigateSpy).toHaveBeenCalledWith([], {
        relativeTo: TestBed.inject(ActivatedRoute),
        info: KEEP_SCROLL,
        queryParams: { year: 1994, sort: 'moves', order: 'asc' },
      });
    });

    it('should fall back to the default sort when a column is unsorted', () => {
      component.onSorted({ column: 'moves', direction: null });

      expect(navigateSpy).toHaveBeenCalledWith([], {
        relativeTo: TestBed.inject(ActivatedRoute),
        info: KEEP_SCROLL,
        queryParams: { year: 1994 },
      });
    });

    it('should page on the server', () => {
      component.onPageChanged({ page: 3, pageSize: 50 });

      expect(navigateSpy).toHaveBeenCalledWith([], {
        relativeTo: TestBed.inject(ActivatedRoute),
        info: KEEP_SCROLL,
        queryParams: { year: 1994, size: 50, page: 3 },
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
      expect(figureTexts()).toEqual(['0 games', '0 players', '0 tournaments', '0 years']);
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
        '989 players',
        '189 tournaments',
        '53 years',
      ]);
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
      ).toEqual(['Jane Smith', 'John Doe']);
      expect(queryTextContent(rows[0], '.games__result')).toBe('½-½');
      expect(queryTextContent(rows[0], '.games__event')).toBe('Club Championship');
      expect(queryTextContent(rows[0], '.games__section')).toBe('(A1)');
      expect(queryTextContent(rows[0], '.games__eco')).toBe('D02');
      expect(queryTextContent(rows[1], '.games__date')).toBe('October 1994');
      expect(queryTextContent(rows[1], '.games__result')).toBe('1-0');
      expect(queryTextContent(rows[2], '.games__event')).toBe('Unknown event');
    });

    it('should size the columns by the widest games resolved with the route', () => {
      fixture.componentRef.setInput('widestGames', [MOCK_GAMES[1]]);
      fixture.detectChanges();

      const sizingRows: GameRow[] = query(
        fixture.debugElement,
        'ea-data-table',
      ).componentInstance.sizingRows();

      expect(sizingRows.map(row => row.game)).toEqual([MOCK_GAMES[1]]);
      expect(
        queryAll(fixture.debugElement, '.ea-data-table__sizing .ea-data-table__row'),
      ).toHaveLength(1);
    });

    it('should render the failure panel when the reference data fails to load', () => {
      store.overrideSelector(GamesSelectors.selectReferenceStatus, 'failed');
      store.refreshState();
      fixture.detectChanges();

      expect(query(fixture.debugElement, 'lcc-load-failed')).toBeTruthy();
      expect(query(fixture.debugElement, 'ea-data-table')).toBeFalsy();
    });

    it('should offer a long opening in full from its tooltip', () => {
      const cell = query(
        fixture.debugElement,
        '.ea-data-table__body .games__opening-cell',
      );
      const tooltip = cell.injector.get(TooltipDirective);

      expect(tooltip.eaTooltip()).toBe(MOCK_GAMES[1].opening);
      expect(tooltip.whenClipped()).toBe(true);
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

      it('should hold a skeleton row for each game the table showed', () => {
        const rows = queryAll(
          fixture.debugElement,
          '.ea-data-table__body .ea-data-table__row',
        );

        expect(rows).toHaveLength(3);
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

    it('should show placeholders in place of the games while they refresh', () => {
      store.overrideSelector(GamesSelectors.selectIsFetchingFiltered, true);
      store.refreshState();
      fixture.detectChanges();

      expect(
        queryAll(fixture.debugElement, '.ea-data-table__body .ea-data-table__row'),
      ).toHaveLength(3);
      expect(
        query(fixture.debugElement, '.ea-data-table__body lcc-text-skeleton'),
      ).toBeTruthy();
    });

    it('should say when no games match', () => {
      store.overrideSelector(GamesSelectors.selectFilteredGames, []);
      store.overrideSelector(GamesSelectors.selectFilteredCount, 0);
      store.refreshState();
      fixture.detectChanges();

      expect(query(fixture.debugElement, 'ea-data-table')).toBeFalsy();
      expect(
        query(fixture.debugElement, 'ea-empty-state').nativeElement.textContent,
      ).toContain('No games match these filters.');
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
