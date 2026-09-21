import {
  CardComponent,
  DataTableColumn,
  DataTableSortState,
  PaginatorComponent,
  PaginatorState,
  TooltipDirective,
} from '@eagami/ui';
import { Store } from '@ngrx/store';
import { combineLatest } from 'rxjs';
import { map, switchMap, take } from 'rxjs/operators';

import {
  ChangeDetectionStrategy,
  Component,
  TemplateRef,
  computed,
  inject,
  input,
  linkedSignal,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';

import { DataTableComponent } from '@app/components/data-table/data-table.component';
import { LoadFailedComponent } from '@app/components/load-failed/load-failed.component';
import { TOURNAMENT_SIZING } from '@app/constants/tournament-sizing';
import {
  LOADING_RESULT_COUNT,
  MEMBER_TOURNAMENTS_PAGE_SIZES,
  TOURNAMENT_FORMAT_LABELS,
  WIDEST_DATE,
  WIDEST_END_DATE,
} from '@app/constants/tournaments';
import { MemberTournamentResult, TournamentFormat } from '@app/models';
import { TournamentsActions, TournamentsSelectors } from '@app/store/tournaments';
import {
  compareCells,
  formatDateRange,
  formatScore,
  shortenSubtitle,
  timeControlMinutes,
} from '@app/utils';

// The sort keys hold raw values, so the table orders the rows the way this component does
export interface ResultRow {
  id: string;
  result: MemberTournamentResult;
  date: string;
  dateLabel: string;
  tournament: string;
  section: string;
  format: string;
  timeControl: string;
  // Minutes, so time controls sort by length
  thinkingTime: number;
  // Rank first, then the field: a rank among more players is the better result
  place: number;
  placeLabel: string;
  score: number | null;
  scoreLabel: string;
  rating: number | null;
  provisionalGames: number | null;
}

// Leaves room under each rank for the size of the field
const RANK_WEIGHT = 1000;

function toResultRow(result: MemberTournamentResult, index: number): ResultRow {
  const { tournament } = result;
  const isSimul = tournament.format === 'tandem-simul';
  return {
    id: `${index}-${tournament.number}`,
    result,
    date: tournament.date,
    dateLabel: formatDateRange(tournament.date, tournament.endDate),
    tournament: tournament.name,
    section: shortenSubtitle(result.section),
    format: TOURNAMENT_FORMAT_LABELS[tournament.format],
    timeControl: tournament.timeControl,
    thinkingTime: timeControlMinutes(tournament.timeControl),
    place: result.rank * RANK_WEIGHT - result.playerCount,
    placeLabel: isSimul
      ? `Board ${result.rank}`
      : `${result.rank} of ${result.playerCount}`,
    score: result.score,
    scoreLabel: isSimul ? result.resultNote : formatScore(result.score),
    rating: result.rating,
    provisionalGames: result.provisionalGames,
  };
}

const INITIAL_SORT: DataTableSortState = { column: 'date', direction: 'desc' };

function cycle<T>(items: T[], index: number, fallback: T): T {
  return items.length ? items[index % items.length] : fallback;
}

const SIZING_ROWS: ResultRow[] = (() => {
  const {
    tournaments,
    timeControls,
    sections,
    resultNotes,
    maxSectionPlayers,
    maxRating,
    maxProvisionalGames,
    maxScore,
    hasDateRanges,
  } = TOURNAMENT_SIZING;
  const formats = Object.keys(TOURNAMENT_FORMAT_LABELS) as TournamentFormat[];
  const count = Math.max(
    tournaments.length,
    timeControls.length,
    sections.length,
    formats.length,
  );

  return Array.from({ length: count }, (_, index) => {
    const tournament = cycle(tournaments, index, { name: '', subtitle: '' });
    const row = toResultRow(
      {
        tournament: {
          number: index,
          name: tournament.name,
          subtitle: tournament.subtitle,
          date: WIDEST_DATE,
          endDate: hasDateRanges ? WIDEST_END_DATE : null,
          format: cycle(formats, index, 'swiss'),
          timeControl: cycle(timeControls, index, ''),
          isRated: false,
        },
        section: cycle(sections, index, ''),
        roundCount: 0,
        playerCount: maxSectionPlayers,
        rank: maxSectionPlayers,
        rating: maxRating,
        provisionalGames: maxProvisionalGames,
        performanceRating: null,
        score: Math.floor(maxScore) + 0.5,
        resultNote: cycle(resultNotes, index, ''),
      },
      index,
    );
    return { ...row, id: `sizing-${index}` };
  });
})();

type CellTemplate = TemplateRef<{ $implicit: ResultRow; value: unknown }>;

@Component({
  selector: 'lcc-member-tournaments',
  templateUrl: './member-tournaments.component.html',
  styleUrl: './member-tournaments.component.scss',
  imports: [
    CardComponent,
    DataTableComponent,
    LoadFailedComponent,
    PaginatorComponent,
    TooltipDirective,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MemberTournamentsComponent {
  public readonly memberNumber = input.required<number>();

  private readonly router = inject(Router);
  private readonly store = inject(Store);

  private readonly dateCell = viewChild<CellTemplate>('dateCell');
  private readonly tournamentCell = viewChild<CellTemplate>('tournamentCell');
  private readonly formatCell = viewChild<CellTemplate>('formatCell');
  private readonly timeControlCell = viewChild<CellTemplate>('timeControlCell');
  private readonly placeCell = viewChild<CellTemplate>('placeCell');
  private readonly scoreCell = viewChild<CellTemplate>('scoreCell');
  private readonly ratingCell = viewChild<CellTemplate>('ratingCell');

  protected readonly pageSizes = MEMBER_TOURNAMENTS_PAGE_SIZES;
  protected readonly sizingRows = SIZING_ROWS;
  protected readonly loadingRowCount = LOADING_RESULT_COUNT;

  private readonly memberNumber$ = toObservable(this.memberNumber);

  private readonly state = toSignal(
    this.memberNumber$.pipe(
      switchMap(memberNumber =>
        combineLatest([
          this.store.select(TournamentsSelectors.selectMemberResults(memberNumber)),
          this.store.select(TournamentsSelectors.selectMemberResultsStatus(memberNumber)),
        ]),
      ),
      map(([results, status]) => ({ results, status })),
    ),
  );

  protected readonly status = computed(() => this.state()?.status ?? 'loading');

  protected readonly loading = computed(() => this.status() === 'loading');

  protected readonly sortState = signal<DataTableSortState>(INITIAL_SORT);

  private readonly allRows = computed(() => {
    const { column, direction } = this.sortState();
    const order = direction === 'desc' ? -1 : 1;
    return (this.state()?.results ?? [])
      .map(toResultRow)
      .sort((a, b) => order * compareCells(a, b, column));
  });

  protected readonly resultCount = computed(() => this.allRows().length);

  protected readonly pageSize = signal(MEMBER_TOURNAMENTS_PAGE_SIZES[0]);

  // A new member or order starts at the first page
  protected readonly page = linkedSignal<[number, DataTableSortState], number>({
    source: () => [this.memberNumber(), this.sortState()],
    computation: () => 1,
  });

  protected readonly rows = computed(() => {
    const start = (this.page() - 1) * this.pageSize();
    return this.allRows().slice(start, start + this.pageSize());
  });

  protected readonly columns = computed<DataTableColumn<ResultRow>[]>(() => {
    const cells = {
      date: this.dateCell(),
      tournament: this.tournamentCell(),
      format: this.formatCell(),
      timeControl: this.timeControlCell(),
      place: this.placeCell(),
      score: this.scoreCell(),
      rating: this.ratingCell(),
    };
    if (Object.values(cells).some(cell => !cell)) {
      return [];
    }
    return [
      {
        key: 'date',
        label: 'Date(s)',
        sortable: true,
        align: 'right',
        cellTemplate: cells.date,
      },
      {
        key: 'tournament',
        label: 'Tournament',
        sortable: true,
        cellTemplate: cells.tournament,
      },
      { key: 'format', label: 'Format', sortable: true, cellTemplate: cells.format },
      {
        key: 'thinkingTime',
        label: 'Time control',
        sortable: true,
        cellTemplate: cells.timeControl,
      },
      {
        key: 'place',
        label: 'Place',
        sortable: true,
        align: 'right',
        cellTemplate: cells.place,
      },
      {
        key: 'score',
        label: 'Score',
        sortable: true,
        align: 'right',
        cellTemplate: cells.score,
      },
      {
        key: 'rating',
        label: 'Rating',
        sortable: true,
        align: 'right',
        cellTemplate: cells.rating,
      },
    ];
  });

  protected readonly rowHref = ({ result }: ResultRow): string =>
    `/tournaments/${result.tournament.number}`;

  constructor() {
    // Fetched once a visit, as tournaments only change by import
    this.memberNumber$
      .pipe(
        switchMap(memberNumber =>
          this.store.select(TournamentsSelectors.selectMemberResults(memberNumber)).pipe(
            take(1),
            map(results => ({ memberNumber, results })),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe(({ memberNumber, results }) => {
        if (!results) {
          this.store.dispatch(
            TournamentsActions.fetchMemberTournamentsRequested({ memberNumber }),
          );
        }
      });
  }

  public onSorted({ column, direction }: DataTableSortState): void {
    this.sortState.set(direction ? { column, direction } : INITIAL_SORT);
  }

  public onPageChanged({ page, pageSize }: PaginatorState): void {
    this.pageSize.set(pageSize);
    this.page.set(page);
  }

  public onOpenTournament({ result }: ResultRow): void {
    this.router.navigate(['/tournaments', result.tournament.number]);
  }

  public onRetry(): void {
    this.store.dispatch(
      TournamentsActions.fetchMemberTournamentsRequested({
        memberNumber: this.memberNumber(),
      }),
    );
  }
}
