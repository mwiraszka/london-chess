import { DataTableColumn, DialogRef, DialogService } from '@eagami/ui';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { BehaviorSubject } from 'rxjs';

import { DebugElement, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  ActivatedRoute,
  ParamMap,
  Router,
  RouterLink,
  convertToParamMap,
  provideRouter,
} from '@angular/router';

import { BasicDialogComponent } from '@app/components/basic-dialog/basic-dialog.component';
import { MOCK_TOURNAMENTS, MOCK_UPCOMING_TOURNAMENT } from '@app/mocks/tournaments.mock';
import { BasicDialogResult, Tournament, User } from '@app/models';
import {
  AuthDrawerService,
  MetaAndTitleService,
  StoreRequestService,
  UserService,
} from '@app/services';
import { AuthSelectors } from '@app/store/auth';
import { TournamentsActions, initialState } from '@app/store/tournaments';
import { tournamentsAdapter } from '@app/store/tournaments/tournaments.reducer';
import {
  closedDialogRef,
  lastOpenedDialog,
  query,
  queryAll,
  queryTextContent,
} from '@app/utils';

import { CrosstableRow, TournamentPageComponent } from './tournament-page.component';

describe('TournamentPageComponent', () => {
  let fixture: ComponentFixture<TournamentPageComponent>;
  let router: Router;
  let store: MockStore;

  let dispatchSpy: MockInstance;
  let paramMap: BehaviorSubject<ParamMap>;

  const memberNumber = signal<number | null>(null);

  const stateWith = (tournaments: Tournament[], failed = false) => ({
    authState: { user: null },
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
        { provide: AuthDrawerService, useValue: { openLogin: vi.fn() } },
        { provide: DialogService, useValue: { open: vi.fn(() => closedDialogRef()) } },
        {
          provide: StoreRequestService,
          useValue: { dispatch: vi.fn().mockResolvedValue(null) },
        },
        { provide: UserService, useValue: { memberNumber } },
      ],
    }).compileComponents();

    memberNumber.set(null);

    fixture = TestBed.createComponent(TournamentPageComponent);
    router = TestBed.inject(Router);
    store = TestBed.inject(MockStore);
    store.setState(stateWith([...MOCK_TOURNAMENTS, MOCK_UPCOMING_TOURNAMENT]));

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
        'Player',
        'Rating',
        'Rd 1',
        'Rd 2',
        'Rd 3',
        'Total',
      ]);
      expect(tableRows(table)).toEqual([
        ['1', 'Doe, John', '1850', 'W2', 'H', 'W3', '2½'],
        ['2', 'Smith, Jane', '1640/6', 'L1', 'W3', 'U', '1'],
        ['3', 'Bloggs, Joe', 'Unrated', 'B', 'L2', 'L1', '0'],
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
        'Bloggs, Joe',
        'Doe, John',
        'Smith, Jane',
      ]);
    });

    it('should size each crosstable by its own rows', () => {
      expect(
        queryAll(fixture.debugElement, '.crosstable .ea-data-table__sizing'),
      ).toHaveLength(0);
    });

    it('should describe each round in its tooltip', () => {
      const [first] = queryAll(
        fixture.debugElement,
        '.ea-data-table__body .crosstable__round',
      );

      expect(first.attributes['aria-label']).toBe('Won with white against Jane Smith.');
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

      expect(tableRows(table)).toEqual([['1', 'John Doe', '1-0', 'Jane Smith']]);
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

      expect(textOf(givers)).toBe('Simul givers: Doe, John (2302) / Smith, Jane (2189)');
      expect(queryAll(givers, '.details__extra').map(textOf)).toEqual([
        '(2302)',
        '(2189)',
      ]);
    });

    it('should list each board with its result', () => {
      const table = query(fixture.debugElement, '.crosstable');

      expect(headers(table)).toEqual(['Board', 'Player', 'Rating', 'Result']);
      expect(tableRows(table)).toEqual([
        ['1', 'Smith, Jane', '1640', 'Draw'],
        ['2', 'Bloggs, Joe', 'Unrated', 'Loss'],
      ]);
    });

    it('should give each giver their own boards when they took them separately', () => {
      const [simul] = MOCK_TOURNAMENTS.filter(({ number }) => number === 111);
      const [section] = simul.sections;
      const byGiver = {
        ...simul,
        subtitle: 'Doe, John 2302 / Smith, Jane 2189',
        sections: [
          { ...section, name: 'Doe, John 2302', entries: [section.entries[0]] },
          { ...section, name: 'Smith, Jane 2189', entries: [section.entries[1]] },
        ],
      };
      store.setState(stateWith([byGiver]));
      fixture.detectChanges();

      expect(queryAll(fixture.debugElement, '.section__heading').map(textOf)).toEqual([
        'Doe, John (2302)',
        'Smith, Jane (2189)',
      ]);
      expect(
        queryAll(fixture.debugElement, '.section__heading-extra').map(textOf),
      ).toEqual(['(2302)', '(2189)']);
      expect(queryAll(fixture.debugElement, '.crosstable')).toHaveLength(2);
    });

    it('should name a pair who gave their boards together side by side', () => {
      const [simul] = MOCK_TOURNAMENTS.filter(({ number }) => number === 111);
      const [section] = simul.sections;
      const byPair = {
        ...simul,
        subtitle: 'Doe, John 2302 / Smith, Jane 2189 / Bloggs, Joe 1500',
        sections: [
          { ...section, name: 'Doe, John 2302', entries: [section.entries[0]] },
          {
            ...section,
            name: 'Smith, Jane 2189 / Bloggs, Joe 1500',
            entries: [section.entries[1]],
          },
        ],
      };
      store.setState(stateWith([byPair]));
      fixture.detectChanges();

      expect(queryAll(fixture.debugElement, '.section__heading').map(textOf)).toEqual([
        'Doe, John (2302)',
        'Smith, Jane (2189) / Bloggs, Joe (1500)',
      ]);
      expect(
        queryAll(fixture.debugElement, '.section__heading-extra').map(textOf),
      ).toEqual(['(2302)']);
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
      expect(headers(tables[0])).toEqual(['#', 'Player', 'Rating', 'Total']);
      expect(tableRows(tables[1])).toEqual([['1', 'Bloggs, Joe', '1320', '4']]);
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
      expect(queryAll(rows[0], '.ea-data-table__placeholder')).toHaveLength(10);
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

  describe('details recorded only for some tournaments', () => {
    const [swiss] = MOCK_TOURNAMENTS.filter(({ number }) => number === 90);
    const [simul] = MOCK_TOURNAMENTS.filter(({ number }) => number === 111);

    const show = (tournament: Tournament) => {
      store.setState(stateWith([tournament]));
      open(tournament.number);
    };

    it('should leave out a missing time control and count a lone player', () => {
      const [section] = swiss.sections;
      show({
        ...swiss,
        timeControl: '',
        sections: [{ ...section, entries: [section.entries[0]] }],
      });

      expect(queryAll(fixture.debugElement, '.details__item').map(textOf)).toEqual([
        'October 19, 2023',
        'Swiss (rated)',
        '1 player',
      ]);
    });

    it('should show a subtitle that names no one as it is', () => {
      show({ ...simul, subtitle: 'Club members' });

      const subtitle = query(fixture.debugElement, '.details__subtitle');
      expect(textOf(subtitle)).toContain('Club members');
      expect(query(subtitle, '.details__person')).toBeFalsy();
    });

    it('should name simul givers without ratings plainly', () => {
      const [section] = simul.sections;
      show({
        ...simul,
        subtitle: 'Doe, John / Smith, Jane',
        sections: [
          { ...section, name: 'Doe, John', entries: [section.entries[0]] },
          {
            ...section,
            name: 'Smith, Jane / Bloggs, Joe',
            entries: [section.entries[1]],
          },
        ],
      });

      expect(
        queryAll(fixture.debugElement, '.details__subtitle .details__person').map(textOf),
      ).toEqual(['Doe, John', 'Smith, Jane']);
      expect(queryAll(fixture.debugElement, '.section__heading').map(textOf)).toEqual([
        'Doe, John',
        'Smith, Jane / Bloggs, Joe',
      ]);
      expect(
        query(fixture.debugElement, '.details__subtitle .details__extra'),
      ).toBeFalsy();
    });

    it('should leave a round blank where a player has no result', () => {
      const [section] = swiss.sections;
      const [first] = section.entries;
      show({
        ...swiss,
        sections: [
          {
            ...section,
            entries: [
              {
                ...first,
                rounds: [{ ...first.rounds[0], opponentRank: 9, gameId: null }],
              },
            ],
          },
        ],
      });

      const [row] = tableRows(query(fixture.debugElement, '.crosstable'));
      expect(row.slice(3, 6)).toEqual([expect.any(String), '', '']);
      expect(row[3]).not.toBe('');
    });
  });

  describe('an upcoming tournament', () => {
    const member: User = {
      id: 'user_member',
      firstName: 'Joe',
      lastName: 'Bloggs',
      email: 'joe@example.com',
      isAdmin: false,
    };

    const signIn = (user: User | null, number: number | null = null) => {
      store.overrideSelector(AuthSelectors.selectUser, user);
      store.overrideSelector(AuthSelectors.selectIsAdmin, !!user?.isAdmin);
      store.refreshState();
      memberNumber.set(number);
    };

    const openUpcoming = (changes: Partial<Tournament> = {}) => {
      store.setState(stateWith([{ ...MOCK_UPCOMING_TOURNAMENT, ...changes }]));
      open(MOCK_UPCOMING_TOURNAMENT.number);
    };

    const registration = () => query(fixture.debugElement, '.registration');

    it('should list the registered players with their ratings', () => {
      openUpcoming();

      expect(
        queryAll(fixture.debugElement, '.registration__registrant').map(registrant => [
          textOf(query(registrant, 'lcc-member-link')),
          textOf(query(registrant, '.registration__rating')),
        ]),
      ).toEqual([
        ['John Doe', '1850'],
        ['Joe Bloggs', '1500/7'],
      ]);
      expect(textOf(query(fixture.debugElement, '.details__pending'))).toBe(
        'Standings will appear here once the tournament is under way.',
      );
    });

    it('should ask a visitor to log in to register', () => {
      openUpcoming();

      query(fixture.debugElement, '.log-in-button').triggerEventHandler('clicked');

      expect(queryTextContent(fixture.debugElement, '.registration__status')).toMatch(
        /^Registration is open until /,
      );
      expect(TestBed.inject(AuthDrawerService).openLogin).toHaveBeenCalled();
    });

    it('should register a member who has not registered yet', async () => {
      signIn(member, 44);
      openUpcoming();

      query(fixture.debugElement, '.register-button').triggerEventHandler('clicked');
      await fixture.whenStable();

      expect(TestBed.inject(StoreRequestService).dispatch).toHaveBeenCalledWith(
        TournamentsActions.registrationRequested({
          tournamentNumber: MOCK_UPCOMING_TOURNAMENT.number,
          tournamentName: MOCK_UPCOMING_TOURNAMENT.name,
        }),
        [TournamentsActions.registrationSucceeded, TournamentsActions.registrationFailed],
      );
    });

    it('should let a registered member withdraw once they confirm', async () => {
      signIn(member, 7);
      openUpcoming();
      const dialogOpenSpy = vi.mocked(TestBed.inject(DialogService).open);
      dialogOpenSpy.mockImplementation(() => {
        const confirmation = new DialogRef<BasicDialogResult>();
        void lastOpenedDialog(dialogOpenSpy)
          .confirmAction?.()
          .then(() => confirmation.close('confirm'));
        return confirmation;
      });

      query(fixture.debugElement, '.withdraw-button').triggerEventHandler('clicked');
      await fixture.whenStable();

      expect(textOf(query(fixture.debugElement, '.registration__registered'))).toBe(
        'You are registered.',
      );
      expect(dialogOpenSpy).toHaveBeenCalledWith(BasicDialogComponent, expect.anything());
      expect(TestBed.inject(StoreRequestService).dispatch).toHaveBeenCalledWith(
        TournamentsActions.withdrawalRequested({
          tournamentNumber: MOCK_UPCOMING_TOURNAMENT.number,
          tournamentName: MOCK_UPCOMING_TOURNAMENT.name,
        }),
        [TournamentsActions.withdrawalSucceeded, TournamentsActions.withdrawalFailed],
      );
    });

    it('should offer no registration before it opens or after it closes', () => {
      signIn(member, 44);
      openUpcoming({ registrationOpens: '2049-01-01T12:00:00.000Z' });
      const beforeOpening = queryTextContent(
        fixture.debugElement,
        '.registration__status',
      );
      const registerBeforeOpening = query(fixture.debugElement, '.register-button');

      openUpcoming({ registrationCloses: '2026-01-02T12:00:00.000Z' });

      expect(beforeOpening).toMatch(/^Registration opens /);
      expect(registerBeforeOpening).toBeFalsy();
      expect(queryTextContent(fixture.debugElement, '.registration__status')).toBe(
        'Registration has closed.',
      );
      expect(query(fixture.debugElement, '.register-button')).toBeFalsy();
    });

    it('should leave out registration for a tournament that takes none online', () => {
      openUpcoming({
        registrationOpens: null,
        registrationCloses: null,
        registrants: [],
      });

      expect(registration()).toBeFalsy();
    });

    it('should give admins links to edit and delete the tournament', async () => {
      signIn({ ...member, isAdmin: true });
      openUpcoming();
      const dialogOpenSpy = vi.mocked(TestBed.inject(DialogService).open);
      dialogOpenSpy.mockReturnValue(closedDialogRef('cancel'));

      query(
        fixture.debugElement,
        'lcc-admin-toolbar #delete-tournament',
      ).triggerEventHandler('clicked');
      await fixture.whenStable();

      expect(
        queryAll(fixture.debugElement, 'lcc-admin-toolbar lcc-link-list a').map(link =>
          link.injector.get(RouterLink).urlTree?.toString(),
        ),
      ).toEqual([`/tournament/edit/${MOCK_UPCOMING_TOURNAMENT.number}`]);
      expect(lastOpenedDialog(dialogOpenSpy).body).toBe(
        'Delete Fall Rapid (October 15–29, 2050)? Its results and registrations will be lost.',
      );
    });
  });
});
