import { DialogService, TooltipDirective } from '@eagami/ui';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { BehaviorSubject } from 'rxjs';

import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  ActivatedRoute,
  ParamMap,
  Router,
  convertToParamMap,
  provideRouter,
} from '@angular/router';

import {
  MOCK_TOURNAMENT_SUMMARIES,
  MOCK_UPCOMING_SUMMARY,
} from '@app/mocks/tournaments.mock';
import {
  DeletionService,
  KEEP_SCROLL,
  MetaAndTitleService,
  StoreRequestService,
} from '@app/services';
import { AuthSelectors } from '@app/store/auth';
import { TournamentsActions, TournamentsSelectors } from '@app/store/tournaments';
import {
  closedDialogRef,
  clubToday,
  query,
  queryAll,
  queryTextContent,
} from '@app/utils';

import { TournamentRow, TournamentsPageComponent } from './tournaments-page.component';

describe('TournamentsPageComponent', () => {
  let fixture: ComponentFixture<TournamentsPageComponent>;
  let router: Router;
  let store: MockStore;

  let dispatchSpy: MockInstance;
  let navigateSpy: MockInstance;
  let queryParamMap: BehaviorSubject<ParamMap>;

  const bodyRows = () =>
    queryAll(fixture.debugElement, '.ea-data-table__body .ea-data-table__row');

  const cellTexts = (row: ReturnType<typeof bodyRows>[number]) =>
    queryAll(row, '.ea-data-table__cell').map(cell =>
      cell.nativeElement.textContent.replace(/\s+/g, ' ').trim(),
    );

  const options = (dropdown: string): string[] =>
    query(fixture.debugElement, dropdown)
      .componentInstance.options()
      .map(({ label }: { label: string }) => label);

  const navigation = (queryParams: object) => [
    [],
    { relativeTo: TestBed.inject(ActivatedRoute), queryParams, info: KEEP_SCROLL },
  ];

  beforeEach(async () => {
    queryParamMap = new BehaviorSubject(convertToParamMap({}));

    await TestBed.configureTestingModule({
      imports: [TournamentsPageComponent],
      providers: [
        provideMockStore(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { queryParamMap: queryParamMap.asObservable() },
        },
        {
          provide: MetaAndTitleService,
          useValue: { updateTitle: vi.fn(), updateDescription: vi.fn() },
        },
        { provide: DialogService, useValue: { open: vi.fn(() => closedDialogRef()) } },
        {
          provide: StoreRequestService,
          useValue: { dispatch: vi.fn().mockResolvedValue(null) },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TournamentsPageComponent);
    router = TestBed.inject(Router);
    store = TestBed.inject(MockStore);

    dispatchSpy = vi.spyOn(store, 'dispatch');
    navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    store.overrideSelector(
      TournamentsSelectors.selectSummaries,
      MOCK_TOURNAMENT_SUMMARIES,
    );
    store.overrideSelector(TournamentsSelectors.selectSummariesStatus, 'loaded');
    store.overrideSelector(AuthSelectors.selectIsAdmin, false);
    store.refreshState();
  });

  afterEach(() => store.resetSelectors());

  it('should set the page title', () => {
    fixture.detectChanges();

    expect(TestBed.inject(MetaAndTitleService).updateTitle).toHaveBeenCalledWith(
      'Tournaments',
    );
  });

  it('should introduce the tournaments beside a photo', () => {
    fixture.detectChanges();

    expect(query(fixture.debugElement, '.intro__image').attributes['src']).toBe(
      'assets/tournaments.webp',
    );
    expect(query(fixture.debugElement, '.intro__text')).toBeTruthy();
  });

  it('should credit the organisers and say where to send questions', () => {
    fixture.detectChanges();

    const organisers = queryAll(fixture.debugElement, '.intro__text lcc-member-link');

    expect(organisers.map(link => link.componentInstance.memberNumber())).toEqual([1, 2]);
    expect(organisers.every(link => link.componentInstance.name())).toBe(true);
    expect(query(fixture.debugElement, '.intro__text a[href^="mailto:"]')).toBeTruthy();
  });

  it('should stand the trophies in a row', () => {
    fixture.detectChanges();

    expect(
      queryAll(fixture.debugElement, '.trophies .trophy').map(
        image => image.attributes['src'],
      ),
    ).toEqual([
      'assets/trophy-chalice-gold.svg',
      'assets/trophy-chalice-gold.svg',
      'assets/trophy-bowl.svg',
      'assets/trophy-cup-gold.svg',
      'assets/trophy-chalice-gold.svg',
      'assets/trophy-chalice-gold.svg',
    ]);
  });

  it('should list the tournaments, newest first, with their days and shortened subtitles', () => {
    fixture.detectChanges();

    expect(bodyRows().map(cellTexts)).toEqual([
      ['Sep 12 – Nov 14, 2024', 'Championship', 'Round robin', 'G80', '3', '3'],
      ['Jun 27, 2024', 'Tandem Simul 2024', 'Tandem simul', '3 hours', '1', '2'],
      ['Oct 19, 2023', 'Fall Active', 'Swiss', 'G25', '3', '3'],
    ]);
    expect(query(fixture.debugElement, '.ea-data-table__body ea-badge')).toBeFalsy();
  });

  it('should line the dates up on the right', () => {
    fixture.detectChanges();

    const [dateHeader] = queryAll(fixture.debugElement, '.ea-data-table__cell--header');

    expect(dateHeader.nativeElement.textContent.trim()).toBe('Date(s)');
    expect(dateHeader.classes['ea-data-table__cell--align-right']).toBe(true);
  });

  it('should size the columns by the widest of every tournament', () => {
    fixture.detectChanges();

    const sizingRows: TournamentRow[] = query(
      fixture.debugElement,
      'ea-data-table',
    ).componentInstance.sizingRows();

    expect(sizingRows.map(row => row.summary)).toEqual(
      expect.arrayContaining(MOCK_TOURNAMENT_SUMMARIES),
    );
    expect(sizingRows.map(row => row.name)).toContain('Tandem Simul 2024');
    expect(
      queryAll(fixture.debugElement, '.ea-data-table__sizing .ea-data-table__row'),
    ).toHaveLength(sizingRows.length);
  });

  it('should link each row to its tournament', () => {
    fixture.detectChanges();

    expect(query(bodyRows()[2], 'a.ea-data-table__row-link').attributes['href']).toBe(
      '/tournaments/90',
    );
  });

  it('should open a tournament when its row is activated', () => {
    fixture.detectChanges();

    bodyRows()[0].triggerEventHandler('click');

    expect(navigateSpy).toHaveBeenCalledWith(['/tournaments', 118]);
  });

  it('should reorder the tournaments when a column is sorted', () => {
    fixture.detectChanges();

    query(fixture.debugElement, 'ea-data-table').triggerEventHandler('sorted', {
      column: 'thinkingTime',
      direction: 'asc',
    });
    fixture.detectChanges();

    expect(bodyRows().map(row => cellTexts(row)[3])).toEqual(['G25', 'G80', '3 hours']);
  });

  it('should break ties in a sorted column by showing the newest first', () => {
    fixture.detectChanges();

    query(fixture.debugElement, 'ea-data-table').triggerEventHandler('sorted', {
      column: 'rounds',
      direction: 'desc',
    });
    fixture.detectChanges();

    expect(bodyRows().map(row => cellTexts(row)[1])).toEqual([
      'Championship',
      'Fall Active',
      'Tandem Simul 2024',
    ]);
  });

  it('should return to newest first when a column is unsorted', () => {
    fixture.detectChanges();
    const table = query(fixture.debugElement, 'ea-data-table');
    table.triggerEventHandler('sorted', { column: 'name', direction: 'asc' });
    fixture.detectChanges();

    table.triggerEventHandler('sorted', { column: 'name', direction: null });
    fixture.detectChanges();

    expect(bodyRows().map(row => cellTexts(row)[1])).toEqual([
      'Championship',
      'Tandem Simul 2024',
      'Fall Active',
    ]);
  });

  it('should page through the tournaments', () => {
    fixture.detectChanges();

    query(fixture.debugElement, 'ea-paginator').triggerEventHandler('changed', {
      page: 2,
      pageSize: 2,
    });
    fixture.detectChanges();

    expect(bodyRows().map(row => cellTexts(row)[1])).toEqual(['Fall Active']);
  });

  it('should set a qualifying subtitle beside the name, in full in its tooltip', () => {
    store.overrideSelector(TournamentsSelectors.selectSummaries, [
      { ...MOCK_TOURNAMENT_SUMMARIES[2], subtitle: 'Section A' },
    ]);
    store.refreshState();

    fixture.detectChanges();

    const name = query(bodyRows()[0], '.tournaments__name');
    expect(query(name, '.tournaments__subtitle').nativeElement.textContent).toBe(
      '(Section A)',
    );
    expect(name.injector.get(TooltipDirective).eaTooltip()).toBe(
      'Fall Active (Section A)',
    );
  });

  describe('the filters', () => {
    it('should offer every year, time control and format with a tournament', () => {
      fixture.detectChanges();

      expect(options('.filters__year')).toEqual(['All years', '2024', '2023']);
      expect(options('.filters__time-control')).toEqual([
        'All time controls',
        'G25',
        'G80',
        '3 hours',
      ]);
      expect(options('.filters__format')).toEqual([
        'All formats',
        'Swiss',
        'Round robin',
        'Tandem simul',
      ]);
    });

    it('should show only the tournaments matching every filter', () => {
      queryParamMap.next(convertToParamMap({ year: '2024', format: 'round-robin' }));

      fixture.detectChanges();

      expect(bodyRows().map(row => cellTexts(row)[1])).toEqual(['Championship']);
    });

    it('should keep a chosen filter in the address, beside the others', () => {
      queryParamMap.next(convertToParamMap({ year: '2024' }));
      fixture.detectChanges();

      query(fixture.debugElement, '.filters__time-control').triggerEventHandler(
        'changed',
        'G80',
      );

      expect(navigateSpy).toHaveBeenCalledWith(
        ...navigation({ year: '2024', timeControl: 'G80', format: null }),
      );
    });

    it('should show only the tournaments played at a time control', () => {
      queryParamMap.next(convertToParamMap({ timeControl: 'G25' }));

      fixture.detectChanges();

      expect(bodyRows().map(row => cellTexts(row)[1])).toEqual(['Fall Active']);
    });

    it.each([
      ['.filters__year', '2023', { year: '2023', timeControl: null, format: null }],
      ['.filters__format', 'swiss', { year: null, timeControl: null, format: 'swiss' }],
    ])('should put a filter chosen from %s in the address', (dropdown, value, params) => {
      fixture.detectChanges();

      query(fixture.debugElement, dropdown).triggerEventHandler('changed', value);

      expect(navigateSpy).toHaveBeenCalledWith(...navigation(params));
    });

    it('should clear every filter at once', () => {
      queryParamMap.next(convertToParamMap({ year: '2024', format: 'swiss' }));
      fixture.detectChanges();

      query(fixture.debugElement, '.filters__clear').triggerEventHandler('clicked');

      expect(navigateSpy).toHaveBeenCalledWith(
        ...navigation({ year: null, timeControl: null, format: null }),
      );
    });

    it('should have nothing to clear until a filter is set', () => {
      fixture.detectChanges();

      expect(
        query(fixture.debugElement, '.filters__clear').componentInstance.disabled(),
      ).toBe(true);
    });
  });

  describe('while the tournaments load', () => {
    beforeEach(() => {
      store.overrideSelector(TournamentsSelectors.selectSummaries, []);
      store.overrideSelector(TournamentsSelectors.selectSummariesStatus, 'loading');
      store.refreshState();
      fixture.detectChanges();
    });

    it('should hold the page below its heading under a single skeleton', () => {
      expect(query(fixture.debugElement, 'lcc-page-header')).toBeTruthy();
      expect(query(fixture.debugElement, 'ea-skeleton')).toBeTruthy();
      expect(query(fixture.debugElement, '.intro')).toBeFalsy();
      expect(query(fixture.debugElement, 'ea-data-table')).toBeFalsy();
    });
  });

  describe('when the tournaments fail to load', () => {
    beforeEach(() => {
      store.overrideSelector(TournamentsSelectors.selectSummaries, []);
      store.overrideSelector(TournamentsSelectors.selectSummariesStatus, 'failed');
      store.refreshState();
      fixture.detectChanges();
    });

    it('should offer to try again in place of the table', () => {
      expect(query(fixture.debugElement, 'ea-data-table')).toBeFalsy();

      query(fixture.debugElement, 'lcc-load-failed').triggerEventHandler('retry');

      expect(dispatchSpy).toHaveBeenCalledWith(
        TournamentsActions.fetchTournamentsRequested(),
      );
    });
  });

  describe('upcoming tournaments', () => {
    beforeEach(() => {
      store.overrideSelector(TournamentsSelectors.selectSummaries, [
        MOCK_UPCOMING_SUMMARY,
        ...MOCK_TOURNAMENT_SUMMARIES,
      ]);
      store.refreshState();
      fixture.detectChanges();
    });

    it('should show tournaments still to come above the archive, with their registration', () => {
      const [card] = queryAll(fixture.debugElement, '.upcoming__item');
      const text = card.nativeElement.textContent.replace(/\s+/g, ' ');

      expect(query(fixture.debugElement, '.upcoming__name').attributes['href']).toBe(
        `/tournaments/${MOCK_UPCOMING_SUMMARY.number}`,
      );
      expect(text).toContain('October 15–29, 2050');
      expect(text).toContain('Registration open until');
      expect(text).toContain('2 players registered');
    });

    it('should count the players registered online for a tournament still to come', () => {
      const [first] = bodyRows();

      expect(cellTexts(first).at(-1)).toBe(
        String(MOCK_UPCOMING_SUMMARY.registrants.length),
      );
    });

    it('should list tournaments still to come first in the table, badged as upcoming', () => {
      const [first] = bodyRows();

      expect(bodyRows()).toHaveLength(MOCK_TOURNAMENT_SUMMARIES.length + 1);
      expect(cellTexts(first).slice(0, 2)).toEqual([
        'Oct 15–29, 2050',
        `${MOCK_UPCOMING_SUMMARY.name} Upcoming`,
      ]);
    });

    it('should badge a tournament under way as in progress', () => {
      store.overrideSelector(TournamentsSelectors.selectSummaries, [
        { ...MOCK_UPCOMING_SUMMARY, date: clubToday(), endDate: null },
        ...MOCK_TOURNAMENT_SUMMARIES,
      ]);
      store.refreshState();
      fixture.detectChanges();

      expect(queryTextContent(bodyRows()[0], 'ea-badge')).toBe('In progress');
    });
  });

  describe('for admins', () => {
    beforeEach(() => {
      store.overrideSelector(AuthSelectors.selectIsAdmin, true);
      store.refreshState();
      fixture.detectChanges();
    });

    it('should offer to add a tournament', () => {
      expect(
        query(
          fixture.debugElement,
          'lcc-admin-toolbar lcc-link-list',
        ).componentInstance.links(),
      ).toEqual([expect.objectContaining({ internalPath: ['tournament', 'add'] })]);
    });

    it('should edit and delete a tournament from its controls', () => {
      const [summary] = MOCK_TOURNAMENT_SUMMARIES;
      const deleteTournament = vi
        .spyOn(TestBed.inject(DeletionService), 'deleteTournament')
        .mockResolvedValue(false);

      const controls = fixture.componentInstance.controlsFor(summary);
      controls.deleteCb();

      expect(controls.editPath).toEqual(['tournament', 'edit', String(summary.number)]);
      expect(deleteTournament).toHaveBeenCalledExactlyOnceWith(summary);
    });
  });
});
