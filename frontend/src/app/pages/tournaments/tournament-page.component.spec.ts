import { DataTableColumn } from '@eagami/ui';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { BehaviorSubject } from 'rxjs';

import { DebugElement } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  ActivatedRoute,
  ParamMap,
  Router,
  RouterLink,
  convertToParamMap,
  provideRouter,
} from '@angular/router';

import { TOURNAMENT_SIZING } from '@app/constants/tournament-sizing';
import { MOCK_TOURNAMENTS } from '@app/mocks/tournaments.mock';
import { Tournament } from '@app/models';
import { MetaAndTitleService } from '@app/services';
import { TournamentsActions, initialState } from '@app/store/tournaments';
import { tournamentsAdapter } from '@app/store/tournaments/tournaments.reducer';
import { query, queryAll, queryTextContent } from '@app/utils';

import { CrosstableRow, TournamentPageComponent } from './tournament-page.component';

describe('TournamentPageComponent', () => {
  let fixture: ComponentFixture<TournamentPageComponent>;
  let router: Router;
  let store: MockStore;

  let dispatchSpy: MockInstance;
  let paramMap: BehaviorSubject<ParamMap>;

  const stateWith = (tournaments: Tournament[], failed = false) => ({
    tournamentsState: tournamentsAdapter.setAll(tournaments, {
      ...initialState,
      failedLoads: failed ? ['tournament' as const] : [],
    }),
  });

  const textOf = (element: DebugElement): string =>
    element.nativeElement.textContent.replace(/\s+/g, ' ').trim();

  const tableRows = (table: DebugElement) =>
    queryAll(table, '.ea-data-table__body .ea-data-table__row').map(row =>
      queryAll(row, '.ea-data-table__cell').map(textOf),
    );

  const headers = (table: DebugElement) =>
    queryAll(table, '.ea-data-table__cell--header').map(textOf);

  const links = () =>
    queryAll(fixture.debugElement, 'lcc-link-list a').map(link => ({
      text: textOf(link),
      path: link.injector.get(RouterLink).urlTree?.toString(),
    }));

  const open = (tournamentNumber: number) => {
    paramMap.next(convertToParamMap({ number: String(tournamentNumber) }));
    fixture.detectChanges();
  };

  beforeEach(async () => {
    paramMap = new BehaviorSubject(convertToParamMap({ number: '90' }));

    await TestBed.configureTestingModule({
      imports: [TournamentPageComponent],
      providers: [
        provideMockStore({ initialState: stateWith(MOCK_TOURNAMENTS) }),
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { paramMap: paramMap.asObservable() } },
        {
          provide: MetaAndTitleService,
          useValue: { updateTitle: vi.fn(), updateDescription: vi.fn() },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TournamentPageComponent);
    router = TestBed.inject(Router);
    store = TestBed.inject(MockStore);

    dispatchSpy = vi.spyOn(store, 'dispatch');
  });

  describe('a Swiss tournament with its rounds', () => {
    beforeEach(() => open(90));

    it('should leave fetching a tournament to the guard on its route', () => {
      expect(dispatchSpy).not.toHaveBeenCalled();
    });

    it('should head the page and title it with the tournament', () => {
      expect(queryTextContent(fixture.debugElement, '.page-heading')).toBe('Fall Active');
      expect(TestBed.inject(MetaAndTitleService).updateTitle).toHaveBeenCalledWith(
        'Fall Active, October 19, 2023',
      );
    });

    it('should list the details in a line under the heading', () => {
      expect(queryAll(fixture.debugElement, '.details__item').map(textOf)).toEqual([
        'October 19, 2023',
        'Swiss (rated)',
        'G25',
        '3 players',
      ]);
      expect(query(fixture.debugElement, '.details__subtitle')).toBeFalsy();
    });

    it('should lay out the crosstable round by round', () => {
      const table = query(fixture.debugElement, '.crosstable');

      expect(headers(table)).toEqual([
        '#',
        'Name',
        'Rating',
        'Rd 1',
        'Rd 2',
        'Rd 3',
        'Total',
      ]);
      expect(tableRows(table)).toEqual([
        ['1', 'Litchfield, Gerry', '1850', 'W2', 'H', 'W3', '2½'],
        ['2', 'Chen, Sasha', '1640 P6', 'L1', 'W3', 'U', '1'],
        ['3', 'Okafor, Robin', 'Unrated', 'B', 'L2', 'L1', '0'],
      ]);
    });

    it('should sort by every column but the rounds', () => {
      const table = query(fixture.debugElement, '.crosstable');
      const columns: DataTableColumn<CrosstableRow>[] = table.componentInstance.columns();

      expect(columns.map(({ key, sortable }) => [key, !!sortable])).toEqual([
        ['rank', true],
        ['player', true],
        ['rating', true],
        ['round-1', false],
        ['round-2', false],
        ['round-3', false],
        ['score', true],
      ]);
    });

    it('should reorder the crosstable by surname when the name header is clicked', () => {
      const table = query(fixture.debugElement, '.crosstable');

      queryAll(table, '.ea-data-table__sort-button')[1].nativeElement.click();
      fixture.detectChanges();

      expect(tableRows(table).map(([, name]) => name)).toEqual([
        'Chen, Sasha',
        'Litchfield, Gerry',
        'Okafor, Robin',
      ]);
    });

    it('should size the columns by the widest content in any crosstable', () => {
      const sizingRows: CrosstableRow[] = query(
        fixture.debugElement,
        '.crosstable',
      ).componentInstance.sizingRows();

      expect(sizingRows[0].rank).toBe(TOURNAMENT_SIZING.maxSectionPlayers);
      expect(sizingRows[0].rating).toBe(TOURNAMENT_SIZING.maxRating);
      expect(sizingRows[0]['round-1']?.label).toBe(
        `WL${TOURNAMENT_SIZING.maxSectionPlayers}`,
      );
      expect(sizingRows[0][`round-${TOURNAMENT_SIZING.maxRounds}`]).toBeTruthy();
      expect(
        queryAll(
          fixture.debugElement,
          '.crosstable .ea-data-table__sizing .ea-data-table__row',
        ),
      ).toHaveLength(sizingRows.length);
    });

    it('should describe each round in its tooltip', () => {
      const [first] = queryAll(fixture.debugElement, '.crosstable__round');

      expect(first.attributes['aria-label']).toBe('Won with white against Sasha Chen.');
    });

    it('should link a round to its game when the archive has it', () => {
      const gameLinks = queryAll(fixture.debugElement, 'a.crosstable__round');

      expect(gameLinks).toHaveLength(2);
      expect(gameLinks[0].injector.get(RouterLink).urlTree?.toString()).toBe(
        '/game-archives/64b7f0c2a1d3e4f5a6b7c8d2',
      );
    });

    it('should list the games in the archive, each linked to its game', () => {
      const table = query(fixture.debugElement, '.games');
      const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

      query(table, '.ea-data-table__body .ea-data-table__row').triggerEventHandler(
        'click',
      );

      expect(tableRows(table)).toEqual([['1', 'Gerry Litchfield', '1-0', 'Sasha Chen']]);
      expect(navigateSpy).toHaveBeenCalledWith([
        '/game-archives',
        '64b7f0c2a1d3e4f5a6b7c8d2',
      ]);
    });

    it('should offer the article on the site and the way back', () => {
      expect(links()).toEqual([
        { text: 'See article', path: '/article/view/679ee6041a2b3c4d5e6f7a8b' },
        { text: 'Back to tournaments', path: '/tournaments' },
      ]);
    });
  });

  describe('a tandem simul', () => {
    beforeEach(() => open(111));

    it('should name the simul givers with their ratings set apart', () => {
      const givers = query(fixture.debugElement, '.details__subtitle');

      expect(textOf(givers)).toBe(
        'Simul givers: Gibson, Kevin (2302) / Ivanchuk, Serhii (2189)',
      );
      expect(queryAll(givers, '.details__extra').map(textOf)).toEqual([
        '(2302)',
        '(2189)',
      ]);
    });

    it('should list each board with its result', () => {
      const table = query(fixture.debugElement, '.crosstable');

      expect(headers(table)).toEqual(['Board', 'Name', 'Rating', 'Result']);
      expect(tableRows(table)).toEqual([
        ['1', 'Chen, Sasha', '1640', 'Draw'],
        ['2', 'Okafor, Robin', 'Unrated', 'Loss'],
      ]);
    });

    it('should give each giver their own boards when they took them separately', () => {
      const [simul] = MOCK_TOURNAMENTS.filter(({ number }) => number === 111);
      const [section] = simul.sections;
      const byGiver = {
        ...simul,
        subtitle: 'Gibson, Kevin 2302 / Ivanchuk, Serhii 2189',
        sections: [
          { ...section, name: 'Gibson, Kevin 2302', entries: [section.entries[0]] },
          { ...section, name: 'Ivanchuk, Serhii 2189', entries: [section.entries[1]] },
        ],
      };
      store.setState(stateWith([byGiver]));
      fixture.detectChanges();

      expect(queryAll(fixture.debugElement, '.section__heading').map(textOf)).toEqual([
        'Gibson, Kevin (2302)',
        'Ivanchuk, Serhii (2189)',
      ]);
      expect(
        queryAll(fixture.debugElement, '.section__heading-extra').map(textOf),
      ).toEqual(['(2302)', '(2189)']);
      expect(queryAll(fixture.debugElement, '.crosstable')).toHaveLength(2);
    });

    it('should offer only the way back without an article', () => {
      expect(links()).toEqual([{ text: 'Back to tournaments', path: '/tournaments' }]);
    });
  });

  describe('a round robin recorded as standings over several weeks', () => {
    beforeEach(() => open(118));

    it('should date the tournament from its first day to its last', () => {
      expect(textOf(query(fixture.debugElement, '.details__item'))).toBe(
        'September 12 – November 14, 2024',
      );
    });

    it('should head each section by its rating band where it has one', () => {
      const tables = queryAll(fixture.debugElement, '.crosstable');

      expect(queryAll(fixture.debugElement, '.section__heading').map(textOf)).toEqual([
        'A1',
        'U1500',
      ]);
      expect(headers(tables[0])).toEqual(['#', 'Name', 'Rating', 'Total']);
      expect(tableRows(tables[1])).toEqual([['1', 'Okafor, Robin', '1320', '4']]);
    });

    it("should list only the sections' own games", () => {
      expect(queryAll(fixture.debugElement, '.games')).toHaveLength(1);
    });
  });

  describe('when the tournament is not in the store', () => {
    beforeEach(() => {
      store.setState(stateWith([]));
      open(90);
    });

    it('should leave fetching it to the guard on its route', () => {
      expect(dispatchSpy).not.toHaveBeenCalled();
    });

    it('should hold the page with a skeleton crosstable until it arrives', () => {
      const rows = queryAll(
        fixture.debugElement,
        '.crosstable .ea-data-table__body .ea-data-table__row',
      );

      expect(query(fixture.debugElement, '.page-heading lcc-text-skeleton')).toBeTruthy();
      expect(
        query(fixture.debugElement, '.details--loading lcc-text-skeleton'),
      ).toBeTruthy();
      expect(rows).toHaveLength(10);
      expect(queryAll(rows[0], 'lcc-text-skeleton')).toHaveLength(10);
    });
  });

  describe('when the tournament fails to load', () => {
    beforeEach(() => {
      store.setState(stateWith([], true));
      open(90);
    });

    it('should offer to try again', () => {
      dispatchSpy.mockClear();

      query(fixture.debugElement, 'lcc-load-failed').triggerEventHandler('retry');

      expect(dispatchSpy).toHaveBeenCalledWith(
        TournamentsActions.fetchTournamentRequested({ tournamentNumber: 90 }),
      );
    });
  });
});
