import {
  ArchiveIconComponent,
  AutocompleteComponent,
  ButtonComponent,
  CardComponent,
  DataTableColumn,
  DataTableSortState,
  DropdownComponent,
  EmptyStateComponent,
  FilterXIconComponent,
  PaginatorComponent,
  PaginatorState,
  SegmentedComponent,
  SelectOption,
  TooltipDirective,
} from '@eagami/ui';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { Store } from '@ngrx/store';
import { isEqual } from 'lodash';
import { Observable, interval } from 'rxjs';
import { distinctUntilChanged, filter, map, switchMap, take } from 'rxjs/operators';

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
import { ActivatedRoute, NavigationExtras, Params, Router } from '@angular/router';

import { DataTableComponent } from '@app/components/data-table/data-table.component';
import { LoadFailedComponent } from '@app/components/load-failed/load-failed.component';
import { MemberLinkComponent } from '@app/components/member-link/member-link.component';
import { PageHeaderComponent } from '@app/components/page-header/page-header.component';
import { ARCHIVE_SIZING } from '@app/constants/game-archive-sizing';
import {
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
import { KEEP_SCROLL, MetaAndTitleService } from '@app/services';
import { GamesActions, GamesSelectors } from '@app/store/games';
import {
  formatPartialDate,
  gamesQueryParams,
  pageRowCount,
  parseGamesQuery,
  playerName,
} from '@app/utils';

// The sort keys carry raw values so the table orders a page the way the server did
export interface GameRow {
  id: string;
  game: Game;
  date: string;
  dateLabel: string;
  white: GamePlayer;
  whiteName: string;
  black: GamePlayer;
  blackName: string;
  result: string;
  event: string;
  opening: string;
  moves: number;
}

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
    result: game.result,
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

const FIGURE_LABELS = ['games', 'players', 'tournaments', 'years'];

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

const SORT_COLUMNS: Record<GamesSortBy, string> = {
  date: 'date',
  white: 'whiteName',
  result: 'result',
  black: 'blackName',
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
    EmptyStateComponent,
    LoadFailedComponent,
    MemberLinkComponent,
    PageHeaderComponent,
    PaginatorComponent,
    SegmentedComponent,
    TooltipDirective,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GameArchivesPageComponent implements OnInit {
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
  protected readonly emptyIcon = FilterXIconComponent;
  protected readonly pageSizes = GAMES_PAGE_SIZES;
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
  private readonly isFetching = this.store.selectSignal(
    GamesSelectors.selectIsFetchingFiltered,
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
      summary.playerCount,
      summary.tournamentCount,
      years,
    ];
    return FIGURE_LABELS.map((label, index) => ({ label, value: amounts[index] }));
  });

  private readonly archiveFigures$ = toObservable(this.archiveFigures);

  // Placeholders replace the games during every fetch, so a change of filters shows at once
  protected readonly loading = computed(
    () => this.status() === 'loading' || this.isFetching(),
  );

  protected readonly empty = computed(() => !this.loading() && !this.games().length);

  // The table holds the height it had while the next page loads, so the page below it
  // stays where it is
  protected readonly rowCount = linkedSignal<number, number>({
    source: () => this.games().length,
    computation: (count, previous) =>
      count ||
      previous?.value ||
      pageRowCount(this.query().pageSize, this.filteredCount() ?? GAMES_PAGE_SIZES[0]),
  });

  protected readonly rows = computed<GameRow[]>(() => this.games().map(toGameRow));

  protected readonly sizingRows = SIZING_ROWS;

  // Rows are real links to their games, so the browser shows and can open them
  protected readonly rowHref = ({ game }: GameRow): string => `/game-archives/${game.id}`;

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
      { key: 'whiteName', label: 'White', sortable: true, cellTemplate: cells.white },
      {
        key: 'result',
        label: 'Result',
        sortable: true,
        align: 'center',
        cellTemplate: cells.result,
      },
      { key: 'blackName', label: 'Black', sortable: true, cellTemplate: cells.black },
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

  protected readonly yearOptions = computed<SelectOption[]>(() => [
    { value: '', label: 'All years' },
    ...[...new Set(this.tournaments().flatMap(({ years }) => years))]
      .sort((a, b) => b - a)
      .map(year => ({ value: String(year), label: String(year) })),
  ]);

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
      .pipe(
        map((params, index) =>
          index ? parseGamesQuery(params) : this.arrivalQuery(params),
        ),
        distinctUntilChanged(isEqual),
        untilDestroyed(this),
      )
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
    this.router.navigate(['/game-archives', game.id]);
  }

  public onRetry(): void {
    this.store.dispatch(GamesActions.fetchFilteredGamesRequested());
    if (this.referenceStatus() === 'failed') {
      this.store.dispatch(GamesActions.fetchArchiveReferenceRequested());
    }
  }

  private applyFilters(changes: Partial<GameFilters>): void {
    const query = this.query();
    this.navigateTo({ ...query, page: 1, filters: { ...query.filters, ...changes } });
  }

  // An address that asks for nothing in particular opens the archives as they were
  // last left, and is brought up to date to say so
  private arrivalQuery(params: Params): GamesQuery {
    const requested = parseGamesQuery(params);
    const remembered = this.query();
    if (!isEqual(requested, INITIAL_GAMES_QUERY) || isEqual(remembered, requested)) {
      return requested;
    }
    this.navigateTo(remembered, { replaceUrl: true });
    return remembered;
  }

  private navigateTo(query: GamesQuery, extras: NavigationExtras = {}): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: gamesQueryParams(query),
      info: KEEP_SCROLL,
      ...extras,
    });
  }
}
