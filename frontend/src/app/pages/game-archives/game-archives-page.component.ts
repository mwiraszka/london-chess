import {
  ArchiveIconComponent,
  AutocompleteComponent,
  ButtonComponent,
  CardComponent,
  DataTableColumn,
  DataTableComponent,
  DataTableSortState,
  Dice1IconComponent,
  Dice2IconComponent,
  Dice3IconComponent,
  Dice4IconComponent,
  Dice5IconComponent,
  Dice6IconComponent,
  DropdownComponent,
  PaginatorComponent,
  PaginatorState,
  SegmentedComponent,
  SelectOption,
  SpinnerComponent,
} from '@eagami/ui';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { Actions, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { isEqual } from 'lodash';
import { Observable, forkJoin, interval, timer } from 'rxjs';
import {
  distinctUntilChanged,
  filter,
  last,
  map,
  switchMap,
  take,
  tap,
} from 'rxjs/operators';

import { DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  TemplateRef,
  computed,
  inject,
  linkedSignal,
  signal,
  viewChild,
} from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';

import { LoadFailedComponent } from '@app/components/load-failed/load-failed.component';
import { MemberLinkComponent } from '@app/components/member-link/member-link.component';
import { PageHeaderComponent } from '@app/components/page-header/page-header.component';
import { TextSkeletonComponent } from '@app/components/text-skeleton/text-skeleton.component';
import { ARCHIVE_SIZING } from '@app/constants/game-archive-sizing';
import {
  DIE_ROLL_FRAMES,
  DIE_ROLL_INTERVAL,
  FIGURE_COUNT_UP_DURATION,
  FIGURE_COUNT_UP_INTERVAL,
  GAMES_PAGE_SIZES,
  INITIAL_GAMES_QUERY,
  PLACEHOLDER_GAME,
} from '@app/constants/games';
import {
  Game,
  GameFilters,
  GamePlayer,
  GameResult,
  GamesQuery,
  GamesSortBy,
} from '@app/models';
import { MetaAndTitleService } from '@app/services';
import { GamesActions, GamesSelectors } from '@app/store/games';
import {
  formatPartialDate,
  gamesQueryParams,
  parseGamesQuery,
  playerName,
} from '@app/utils';

// A row stands in for a game that is still loading when it has none. The sort
// keys carry raw values so the table orders a page the way the server did.
export interface GameRow {
  id: string;
  game: Game | null;
  date: string;
  dateLabel: string;
  white: GamePlayer | null;
  whiteName: string;
  black: GamePlayer | null;
  blackName: string;
  event: string;
  opening: string;
  moves: number | null;
}

const LOADING_ROW: Omit<GameRow, 'id'> = {
  game: null,
  date: '',
  dateLabel: '',
  white: null,
  whiteName: '',
  black: null,
  blackName: '',
  event: '',
  opening: '',
  moves: null,
};

function toGameRow(game: Game): GameRow {
  return {
    id: game.id,
    game,
    date: game.date,
    dateLabel: formatPartialDate(game.date),
    white: game.white,
    whiteName: playerName(game.white),
    black: game.black,
    blackName: playerName(game.black),
    event: game.tournament,
    opening: game.eco,
    moves: Math.ceil(game.plyCount / 2),
  };
}

// The longest month name and a two-digit day make the widest date label
const WIDEST_DATE = '2000-09-30';

function cycle<T>(items: T[], index: number, fallback: T): T {
  return items.length ? items[index % items.length] : fallback;
}

// Rows holding the widest content each column shows anywhere in the archive, so
// the columns are sized once for every page rather than by the one on screen
const SIZING_ROWS: GameRow[] = (() => {
  const { players, events, openings, longestGame } = ARCHIVE_SIZING;
  const results: GameResult[] = ['1-0', '1/2-1/2', '0-1'];
  const count = Math.max(players.length, events.length, openings.length, results.length);

  return Array.from({ length: count }, (_, index) => {
    const event = cycle(events, index, { tournament: '', section: '' });
    const opening = cycle(openings, index, { eco: '', name: '' });
    return toGameRow({
      ...PLACEHOLDER_GAME,
      id: `sizing-${index}`,
      date: WIDEST_DATE,
      white: {
        ...PLACEHOLDER_GAME.white,
        ...cycle(players, index, PLACEHOLDER_GAME.white),
      },
      black: {
        ...PLACEHOLDER_GAME.black,
        ...cycle(players, index + 1, PLACEHOLDER_GAME.black),
      },
      tournament: event.tournament,
      section: event.section,
      eco: opening.eco,
      opening: opening.name,
      result: cycle(results, index, PLACEHOLDER_GAME.result),
      plyCount: longestGame * 2,
    });
  });
})();

type CellTemplate = TemplateRef<{ $implicit: GameRow; value: unknown }>;

interface Figure {
  value: number;
  label: string;
}

const FIGURE_LABELS = ['games', 'years', 'players', 'tournaments'];

// Counts the figures up from nothing, quickly at first and settling on the amounts
function countUp(figures: Figure[]): Observable<Figure[]> {
  const frames = Math.ceil(FIGURE_COUNT_UP_DURATION / FIGURE_COUNT_UP_INTERVAL);
  return interval(FIGURE_COUNT_UP_INTERVAL).pipe(
    take(frames),
    map(frame => 1 - Math.pow(1 - (frame + 1) / frames, 3)),
    map(progress =>
      figures.map(figure => ({ ...figure, value: Math.round(figure.value * progress) })),
    ),
  );
}

const DICE = [
  Dice1IconComponent,
  Dice2IconComponent,
  Dice3IconComponent,
  Dice4IconComponent,
  Dice5IconComponent,
  Dice6IconComponent,
];

const SORT_COLUMNS: Record<GamesSortBy, string> = {
  date: 'date',
  tournament: 'event',
  eco: 'opening',
  moves: 'moves',
};

@UntilDestroy()
@Component({
  selector: 'lcc-game-archives-page',
  templateUrl: './game-archives-page.component.html',
  styleUrl: './game-archives-page.component.scss',
  imports: [
    AutocompleteComponent,
    ButtonComponent,
    CardComponent,
    DataTableComponent,
    DecimalPipe,
    DropdownComponent,
    LoadFailedComponent,
    MemberLinkComponent,
    PageHeaderComponent,
    PaginatorComponent,
    SegmentedComponent,
    SpinnerComponent,
    TextSkeletonComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GameArchivesPageComponent implements OnInit {
  private readonly actions$ = inject(Actions);
  private readonly metaAndTitleService = inject(MetaAndTitleService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly store = inject(Store);

  private readonly dateCell = viewChild<CellTemplate>('dateCell');
  private readonly whiteCell = viewChild<CellTemplate>('whiteCell');
  private readonly blackCell = viewChild<CellTemplate>('blackCell');
  private readonly resultCell = viewChild<CellTemplate>('resultCell');
  private readonly eventCell = viewChild<CellTemplate>('eventCell');
  private readonly openingCell = viewChild<CellTemplate>('openingCell');
  private readonly movesCell = viewChild<CellTemplate>('movesCell');

  protected readonly pageIcon = ArchiveIconComponent;
  protected readonly pageSizes = GAMES_PAGE_SIZES;
  protected readonly dieFace = signal(4);
  protected readonly randomIcon = computed(() => DICE[this.dieFace()]);
  protected readonly rolling = signal(false);

  protected readonly figures = signal<Figure[]>(
    FIGURE_LABELS.map(label => ({ label, value: 0 })),
  );

  protected readonly query = this.store.selectSignal(GamesSelectors.selectQuery);
  protected readonly games = this.store.selectSignal(GamesSelectors.selectFilteredGames);
  protected readonly filteredCount = this.store.selectSignal(
    GamesSelectors.selectFilteredCount,
  );
  protected readonly status = this.store.selectSignal(
    GamesSelectors.selectFilteredGamesStatus,
  );
  protected readonly players = this.store.selectSignal(GamesSelectors.selectPlayers);
  protected readonly tournaments = this.store.selectSignal(
    GamesSelectors.selectTournaments,
  );
  protected readonly summary = this.store.selectSignal(GamesSelectors.selectSummary);
  protected readonly referenceStatus = this.store.selectSignal(
    GamesSelectors.selectReferenceStatus,
  );

  private readonly archiveFigures = computed<Figure[] | null>(() => {
    const summary = this.summary();
    if (!summary) {
      return null;
    }
    const { firstYear, lastYear } = summary;
    const years = firstYear !== null && lastYear !== null ? lastYear - firstYear + 1 : 0;
    const amounts = [
      summary.gameCount,
      years,
      summary.playerCount,
      summary.tournamentCount,
    ];
    return FIGURE_LABELS.map((label, index) => ({ label, value: amounts[index] }));
  });

  private readonly archiveFigures$ = toObservable(this.archiveFigures);

  protected readonly loading = computed(
    () => this.status() === 'loading' && !this.games().length,
  );

  protected readonly rows = computed<GameRow[]>(() => {
    if (this.loading()) {
      return Array.from({ length: this.query().pageSize }, (_, index) => ({
        ...LOADING_ROW,
        id: `loading-${index}`,
      }));
    }
    return this.games().map(toGameRow);
  });

  protected readonly sizingRows = SIZING_ROWS;

  // Rows are real links to their games, so the browser shows and can open them
  protected readonly rowHref = ({ game }: GameRow): string | null =>
    game ? `/game-archives/${game.id}` : null;

  protected readonly columns = computed<DataTableColumn<GameRow>[]>(() => {
    const cells = {
      date: this.dateCell(),
      white: this.whiteCell(),
      black: this.blackCell(),
      result: this.resultCell(),
      event: this.eventCell(),
      opening: this.openingCell(),
      moves: this.movesCell(),
    };
    if (Object.values(cells).some(cell => !cell)) {
      return [];
    }
    return [
      { key: 'date', label: 'Date', sortable: true, cellTemplate: cells.date },
      { key: 'white', label: 'White', cellTemplate: cells.white },
      { key: 'result', label: 'Result', align: 'center', cellTemplate: cells.result },
      { key: 'black', label: 'Black', cellTemplate: cells.black },
      { key: 'event', label: 'Event', sortable: true, cellTemplate: cells.event },
      { key: 'opening', label: 'Opening', sortable: true, cellTemplate: cells.opening },
      {
        key: 'moves',
        label: 'Moves',
        sortable: true,
        align: 'right',
        cellTemplate: cells.moves,
      },
    ];
  });

  protected readonly sortState = computed<DataTableSortState>(() => ({
    column: SORT_COLUMNS[this.query().sortBy],
    direction: this.query().sortOrder,
  }));

  protected readonly playerOptions = computed<SelectOption[]>(() =>
    this.players().map(player => ({
      value: player.id,
      label: `${player.lastName}, ${player.firstName}${player.suffix ? ` ${player.suffix}` : ''}`,
    })),
  );

  protected readonly selectedPlayerLabel = computed(
    () =>
      this.playerOptions().find(option => option.value === this.query().filters.player)
        ?.label ?? '',
  );

  // What the player box shows, which is the chosen player until the text is edited
  protected readonly playerText = linkedSignal(() => this.selectedPlayerLabel());

  protected readonly tournamentOptions = computed<SelectOption[]>(() => [
    { value: '', label: 'All tournaments' },
    ...this.tournaments().map(({ name }) => ({ value: name, label: name })),
  ]);

  protected readonly selectedTournament = computed(
    () =>
      this.tournaments().find(({ name }) => name === this.query().filters.tournament) ??
      null,
  );

  protected readonly sectionOptions = computed<SelectOption[]>(() => [
    { value: '', label: 'All sections' },
    ...(this.selectedTournament()?.sections ?? []).map(section => ({
      value: section,
      label: section,
    })),
  ]);

  protected readonly yearOptions = computed<SelectOption[]>(() => {
    const years =
      this.selectedTournament()?.years ?? this.tournaments().flatMap(t => t.years);
    return [
      { value: '', label: 'All years' },
      ...[...new Set(years)]
        .sort((a, b) => b - a)
        .map(year => ({ value: String(year), label: String(year) })),
    ];
  });

  protected readonly yearValue = computed(() => {
    const { year } = this.query().filters;
    return year === null ? '' : String(year);
  });

  protected readonly resultOptions: SelectOption[] = [
    { value: '', label: 'All' },
    { value: '1-0', label: '1-0' },
    { value: '1/2-1/2', label: '½-½' },
    { value: '0-1', label: '0-1' },
  ];

  protected readonly hasFilters = computed(
    () => !isEqual(this.query().filters, INITIAL_GAMES_QUERY.filters),
  );

  public ngOnInit(): void {
    this.metaAndTitleService.updateTitle('Game Archives');
    this.metaAndTitleService.updateDescription(
      'A collection of games played by London Chess Club members, going all the way back to 1974.',
    );

    this.route.queryParams
      .pipe(map(parseGamesQuery), distinctUntilChanged(isEqual), untilDestroyed(this))
      .subscribe(query => this.store.dispatch(GamesActions.queryChanged({ query })));

    this.archiveFigures$
      .pipe(
        filter((figures): figures is Figure[] => figures !== null),
        take(1),
        switchMap(countUp),
        untilDestroyed(this),
      )
      .subscribe(figures => this.figures.set(figures));
  }

  public onPlayerSelected({ value }: SelectOption): void {
    this.applyFilters({ player: value });
  }

  public onPlayerTyped(text: string): void {
    this.playerText.set(text);
    if (text === '' && this.query().filters.player) {
      this.applyFilters({ player: '' });
    }
  }

  public onTournamentChanged(tournament: string): void {
    this.applyFilters({ tournament, section: '' });
  }

  public onSectionChanged(section: string): void {
    this.applyFilters({ section });
  }

  public onYearChanged(year: string): void {
    this.applyFilters({ year: year ? Number(year) : null });
  }

  public onResultChanged(result: string): void {
    this.applyFilters({ result: result as GameResult | '' });
  }

  public onClearFilters(): void {
    this.applyFilters(INITIAL_GAMES_QUERY.filters);
  }

  public onSorted({ column, direction }: DataTableSortState): void {
    const sortBy = (Object.keys(SORT_COLUMNS) as GamesSortBy[]).find(
      key => SORT_COLUMNS[key] === column,
    );
    this.navigateTo({
      ...this.query(),
      page: 1,
      sortBy: direction && sortBy ? sortBy : INITIAL_GAMES_QUERY.sortBy,
      sortOrder: direction && sortBy ? direction : INITIAL_GAMES_QUERY.sortOrder,
    });
  }

  public onPageChanged({ page, pageSize }: PaginatorState): void {
    this.navigateTo({ ...this.query(), page, pageSize });
  }

  public onOpenGame({ game }: GameRow): void {
    if (game) {
      this.router.navigate(['/game-archives', game.id]);
    }
  }

  // Rolls the die for a moment before the game opens, however quickly it arrives
  public onRandomGame(): void {
    if (this.rolling()) {
      return;
    }
    this.rolling.set(true);
    this.store.dispatch(GamesActions.randomGameRequested());

    const rolled$ = timer(DIE_ROLL_INTERVAL, DIE_ROLL_INTERVAL).pipe(
      take(DIE_ROLL_FRAMES),
      tap(() => this.dieFace.set(this.nextFace())),
      last(),
    );
    const outcome$ = this.actions$.pipe(
      ofType(GamesActions.randomGamePicked, GamesActions.randomGameFailed),
      take(1),
    );
    forkJoin([rolled$, outcome$])
      .pipe(untilDestroyed(this))
      .subscribe(([, outcome]) => {
        this.rolling.set(false);
        if (outcome.type === GamesActions.randomGamePicked.type) {
          this.router.navigate(['/game-archives', outcome.gameId]);
        }
      });
  }

  public onRetry(): void {
    this.store.dispatch(GamesActions.fetchFilteredGamesRequested());
    if (this.referenceStatus() === 'failed') {
      this.store.dispatch(GamesActions.fetchArchiveReferenceRequested());
    }
  }

  private nextFace(): number {
    const others = DICE.map((_, face) => face).filter(face => face !== this.dieFace());
    return others[Math.floor(Math.random() * others.length)];
  }

  private applyFilters(changes: Partial<GameFilters>): void {
    const query = this.query();
    this.navigateTo({ ...query, page: 1, filters: { ...query.filters, ...changes } });
  }

  private navigateTo(query: GamesQuery): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: gamesQueryParams(query),
    });
  }
}
