import {
  AwardIconComponent,
  ButtonComponent,
  CardComponent,
  DataTableColumn,
  DataTableSortState,
  DropdownComponent,
  PaginatorComponent,
  PaginatorState,
  SelectOption,
  TooltipDirective,
} from '@eagami/ui';
import { Store } from '@ngrx/store';

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
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';

import { DataTableComponent } from '@app/components/data-table/data-table.component';
import { LoadFailedComponent } from '@app/components/load-failed/load-failed.component';
import { MemberLinkComponent } from '@app/components/member-link/member-link.component';
import { PageHeaderComponent } from '@app/components/page-header/page-header.component';
import { TOURNAMENT_SIZING } from '@app/constants/tournament-sizing';
import {
  TOURNAMENTS_PAGE_SIZES,
  TOURNAMENT_FORMAT_LABELS,
  TROPHIES,
  WIDEST_DATE,
  WIDEST_END_DATE,
} from '@app/constants/tournaments';
import { TournamentFormat, TournamentSummary } from '@app/models';
import { KEEP_SCROLL, MetaAndTitleService } from '@app/services';
import { TournamentsActions, TournamentsSelectors } from '@app/store/tournaments';
import {
  compareCells,
  formatDateRange,
  shortenSubtitle,
  timeControlMinutes,
} from '@app/utils';

// The sort keys hold raw values, so the table orders the rows the way the page does
export interface TournamentRow {
  id: string;
  summary: TournamentSummary;
  date: string;
  dateLabel: string;
  name: string;
  subtitle: string;
  format: string;
  timeControl: string;
  // Minutes, so time controls sort by length
  thinkingTime: number;
  rounds: number;
  players: number;
}

function toTournamentRow(summary: TournamentSummary): TournamentRow {
  return {
    id: String(summary.number),
    summary,
    date: summary.date,
    dateLabel: formatDateRange(summary.date, summary.endDate),
    name: summary.name,
    // A simul's givers show only on its own page
    subtitle: summary.format === 'tandem-simul' ? '' : shortenSubtitle(summary.subtitle),
    format: TOURNAMENT_FORMAT_LABELS[summary.format],
    timeControl: summary.timeControl,
    thinkingTime: timeControlMinutes(summary.timeControl),
    rounds: summary.roundCount,
    players: summary.playerCount,
  };
}

const INITIAL_SORT: DataTableSortState = { column: 'date', direction: 'desc' };

function cycle<T>(items: T[], index: number, fallback: T): T {
  return items.length ? items[index % items.length] : fallback;
}

const SIZING_ROWS: TournamentRow[] = (() => {
  const { tournaments, timeControls, maxRounds, maxPlayers, hasDateRanges } =
    TOURNAMENT_SIZING;
  const formats = Object.keys(TOURNAMENT_FORMAT_LABELS) as TournamentFormat[];
  const count = Math.max(tournaments.length, timeControls.length, formats.length);

  return Array.from({ length: count }, (_, index) =>
    toTournamentRow({
      number: index,
      ...cycle(tournaments, index, { name: '', subtitle: '' }),
      date: WIDEST_DATE,
      endDate: hasDateRanges ? WIDEST_END_DATE : null,
      format: cycle(formats, index, 'swiss'),
      timeControl: cycle(timeControls, index, ''),
      isRated: true,
      sectionCount: 1,
      roundCount: maxRounds,
      playerCount: maxPlayers,
    }),
  );
})();

export interface TournamentFilters {
  year: string;
  timeControl: string;
  format: string;
}

const NO_FILTERS: TournamentFilters = { year: '', timeControl: '', format: '' };

function parseFilters(params: ParamMap | undefined): TournamentFilters {
  return {
    year: params?.get('year') ?? '',
    timeControl: params?.get('timeControl') ?? '',
    format: params?.get('format') ?? '',
  };
}

type CellTemplate = TemplateRef<{ $implicit: TournamentRow; value: unknown }>;

@Component({
  selector: 'lcc-tournaments-page',
  templateUrl: './tournaments-page.component.html',
  styleUrl: './tournaments-page.component.scss',
  imports: [
    ButtonComponent,
    CardComponent,
    DataTableComponent,
    DropdownComponent,
    LoadFailedComponent,
    MemberLinkComponent,
    PageHeaderComponent,
    PaginatorComponent,
    TooltipDirective,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TournamentsPageComponent implements OnInit {
  private readonly metaAndTitleService = inject(MetaAndTitleService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly store = inject(Store);

  private readonly dateCell = viewChild<CellTemplate>('dateCell');
  private readonly nameCell = viewChild<CellTemplate>('nameCell');
  private readonly timeControlCell = viewChild<CellTemplate>('timeControlCell');
  private readonly textCell = viewChild<CellTemplate>('textCell');

  protected readonly pageIcon = AwardIconComponent;
  protected readonly pageSizes = TOURNAMENTS_PAGE_SIZES;
  protected readonly trophies = TROPHIES;

  protected readonly summaries = this.store.selectSignal(
    TournamentsSelectors.selectSummaries,
  );
  protected readonly status = this.store.selectSignal(
    TournamentsSelectors.selectSummariesStatus,
  );

  private readonly queryParams = toSignal(this.route.queryParamMap);

  protected readonly filters = computed(() => parseFilters(this.queryParams()));

  protected readonly hasFilters = computed(() =>
    Object.values(this.filters()).some(value => value !== ''),
  );

  protected readonly sortState = signal<DataTableSortState>(INITIAL_SORT);

  protected readonly pageSize = signal(TOURNAMENTS_PAGE_SIZES[0]);

  // New filters or order start at the first page
  protected readonly page = linkedSignal<[TournamentFilters, DataTableSortState], number>(
    {
      source: () => [this.filters(), this.sortState()],
      computation: () => 1,
    },
  );

  protected readonly yearOptions = computed<SelectOption[]>(() => [
    { value: '', label: 'All years' },
    ...[...new Set(this.summaries().map(({ date }) => date.slice(0, 4)))]
      .sort((a, b) => b.localeCompare(a))
      .map(year => ({ value: year, label: year })),
  ]);

  protected readonly timeControlOptions = computed<SelectOption[]>(() => [
    { value: '', label: 'All time controls' },
    ...[...new Set(this.summaries().map(({ timeControl }) => timeControl))]
      .sort((a, b) => timeControlMinutes(a) - timeControlMinutes(b))
      .map(timeControl => ({ value: timeControl, label: timeControl })),
  ]);

  protected readonly formatOptions = computed<SelectOption[]>(() => {
    const played = new Set(this.summaries().map(({ format }) => format));
    return [
      { value: '', label: 'All formats' },
      ...(Object.keys(TOURNAMENT_FORMAT_LABELS) as TournamentFormat[])
        .filter(format => played.has(format))
        .map(format => ({ value: format, label: TOURNAMENT_FORMAT_LABELS[format] })),
    ];
  });

  protected readonly loading = computed(
    () => this.status() === 'loading' && !this.summaries().length,
  );

  private readonly filteredRows = computed<TournamentRow[]>(() => {
    const { year, timeControl, format } = this.filters();
    const { column, direction } = this.sortState();
    const order = direction === 'asc' ? 1 : -1;
    return this.summaries()
      .filter(
        summary =>
          (!year || summary.date.startsWith(year)) &&
          (!timeControl || summary.timeControl === timeControl) &&
          (!format || summary.format === format),
      )
      .map(toTournamentRow)
      .sort(
        (a, b) =>
          order * compareCells(a, b, column) ||
          Number(b.summary?.number) - Number(a.summary?.number),
      );
  });

  protected readonly filteredCount = computed(() => this.filteredRows().length);

  protected readonly rows = computed<TournamentRow[]>(() => {
    const start = (this.page() - 1) * this.pageSize();
    return this.filteredRows().slice(start, start + this.pageSize());
  });

  protected readonly sizingRows = SIZING_ROWS;

  protected readonly rowHref = ({ summary }: TournamentRow): string =>
    `/tournaments/${summary.number}`;

  protected readonly columns = computed<DataTableColumn<TournamentRow>[]>(() => {
    const cells = {
      date: this.dateCell(),
      name: this.nameCell(),
      timeControl: this.timeControlCell(),
      text: this.textCell(),
    };
    if (!cells.date || !cells.name || !cells.timeControl || !cells.text) {
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
      { key: 'name', label: 'Tournament', sortable: true, cellTemplate: cells.name },
      { key: 'format', label: 'Format', sortable: true, cellTemplate: cells.text },
      {
        key: 'thinkingTime',
        label: 'Time control',
        sortable: true,
        cellTemplate: cells.timeControl,
      },
      {
        key: 'rounds',
        label: 'Rounds',
        sortable: true,
        align: 'right',
        cellTemplate: cells.text,
      },
      {
        key: 'players',
        label: 'Players',
        sortable: true,
        align: 'right',
        cellTemplate: cells.text,
      },
    ];
  });

  public ngOnInit(): void {
    this.metaAndTitleService.updateTitle('Tournaments');
    this.metaAndTitleService.updateDescription(
      'Standings and crosstables from every London Chess Club tournament since 2019.',
    );
  }

  public onFilterChanged(name: keyof TournamentFilters, value: string): void {
    this.applyFilters({ ...this.filters(), [name]: value });
  }

  public onClearFilters(): void {
    this.applyFilters(NO_FILTERS);
  }

  public onSorted({ column, direction }: DataTableSortState): void {
    this.sortState.set(direction ? { column, direction } : INITIAL_SORT);
  }

  public onPageChanged({ page, pageSize }: PaginatorState): void {
    this.pageSize.set(pageSize);
    this.page.set(page);
  }

  public onOpenTournament({ summary }: TournamentRow): void {
    this.router.navigate(['/tournaments', summary.number]);
  }

  public onRetry(): void {
    this.store.dispatch(TournamentsActions.fetchTournamentsRequested());
  }

  private applyFilters(filters: TournamentFilters): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: Object.fromEntries(
        Object.entries(filters).map(([name, value]) => [name, value || null]),
      ),
      info: KEEP_SCROLL,
    });
  }
}
