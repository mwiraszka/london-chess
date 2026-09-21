import {
  CardComponent,
  DataTableColumn,
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
  WIDEST_DATE,
  WIDEST_END_DATE,
} from '@app/constants/tournaments';
import { MemberTournamentResult } from '@app/models';
import { TournamentsActions, TournamentsSelectors } from '@app/store/tournaments';
import { formatDateRange, formatScore, shortenSubtitle } from '@app/utils';

export interface ResultRow {
  id: string;
  result: MemberTournamentResult;
  date: string;
  tournament: string;
  section: string;
  place: string;
  score: string;
  rating: number | null;
  provisionalGames: number | null;
}

function toResultRow(result: MemberTournamentResult, index: number): ResultRow {
  const isSimul = result.tournament.format === 'tandem-simul';
  return {
    id: `${index}-${result.tournament.number}`,
    result,
    date: formatDateRange(result.tournament.date, result.tournament.endDate),
    tournament: result.tournament.name,
    section: shortenSubtitle(result.section),
    place: isSimul ? `Board ${result.rank}` : `${result.rank} of ${result.playerCount}`,
    score: isSimul ? result.resultNote : formatScore(result.score),
    rating: result.rating,
    provisionalGames: result.provisionalGames,
  };
}

function cycle<T>(items: T[], index: number, fallback: T): T {
  return items.length ? items[index % items.length] : fallback;
}

const SIZING_ROWS: ResultRow[] = (() => {
  const {
    tournaments,
    sections,
    maxSectionPlayers,
    maxRating,
    maxProvisionalGames,
    maxScore,
    hasDateRanges,
  } = TOURNAMENT_SIZING;
  const count = Math.max(tournaments.length, sections.length);

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
          format: 'swiss',
          isRated: true,
        },
        section: cycle(sections, index, ''),
        roundCount: 0,
        playerCount: maxSectionPlayers,
        rank: maxSectionPlayers,
        rating: maxRating,
        provisionalGames: maxProvisionalGames,
        performanceRating: null,
        score: Math.floor(maxScore) + 0.5,
        resultNote: '',
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

  private readonly textCell = viewChild<CellTemplate>('textCell');
  private readonly tournamentCell = viewChild<CellTemplate>('tournamentCell');
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

  private readonly allRows = computed(() =>
    (this.state()?.results ?? []).map(toResultRow),
  );

  protected readonly resultCount = computed(() => this.allRows().length);

  protected readonly pageSize = signal(MEMBER_TOURNAMENTS_PAGE_SIZES[0]);

  // A new member starts at the first page
  protected readonly page = linkedSignal<number, number>({
    source: () => this.memberNumber(),
    computation: () => 1,
  });

  protected readonly rows = computed(() => {
    const start = (this.page() - 1) * this.pageSize();
    return this.allRows().slice(start, start + this.pageSize());
  });

  protected readonly columns = computed<DataTableColumn<ResultRow>[]>(() => {
    const text = this.textCell();
    const tournament = this.tournamentCell();
    const rating = this.ratingCell();
    if (!text || !tournament || !rating) {
      return [];
    }
    return [
      { key: 'date', label: 'Date(s)', align: 'right', cellTemplate: text },
      { key: 'tournament', label: 'Tournament', cellTemplate: tournament },
      { key: 'place', label: 'Place', align: 'right', cellTemplate: text },
      { key: 'score', label: 'Score', align: 'right', cellTemplate: text },
      { key: 'rating', label: 'Rating', align: 'right', cellTemplate: rating },
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
