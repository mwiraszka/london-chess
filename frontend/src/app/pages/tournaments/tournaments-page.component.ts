import {
  AwardIconComponent,
  BadgeComponent,
  BadgeVariant,
  ButtonComponent,
  CardComponent,
  DataTableColumn,
  DataTableSortState,
  DropdownComponent,
  EmptyStateComponent,
  FilterXIconComponent,
  PaginatorComponent,
  PaginatorState,
  PlusCircleIconComponent,
  SelectOption,
  SkeletonComponent,
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
import { ActivatedRoute, ParamMap, Router, RouterLink } from '@angular/router';

import { AdminToolbarComponent } from '@app/components/admin-toolbar/admin-toolbar.component';
import { DataTableComponent } from '@app/components/data-table/data-table.component';
import { LoadFailedComponent } from '@app/components/load-failed/load-failed.component';
import { MemberLinkComponent } from '@app/components/member-link/member-link.component';
import { PageHeaderComponent } from '@app/components/page-header/page-header.component';
import {
  TOURNAMENTS_PAGE_SIZES,
  TOURNAMENT_FORMAT_LABELS,
  TOURNAMENT_TIMING_BADGES,
  TROPHIES,
} from '@app/constants/tournaments';
import { AdminControlsDirective } from '@app/directives/admin-controls.directive';
import {
  AdminControlsConfig,
  InternalLink,
  RegistrationStatus,
  TournamentFormat,
  TournamentSummary,
} from '@app/models';
import { DeletionService, KEEP_SCROLL, MetaAndTitleService } from '@app/services';
import { AuthSelectors } from '@app/store/auth';
import { TournamentsActions, TournamentsSelectors } from '@app/store/tournaments';
import {
  clubToday,
  compareCells,
  formatDate,
  formatDateRange,
  isUpcomingTournament,
  pageOf,
  registrationStatus,
  shortenSubtitle,
  timeControlMinutes,
  tournamentTiming,
} from '@app/utils';

// The sort keys hold raw values, so the table orders the rows the way the page does
export interface TournamentRow {
  id: string;
  summary: TournamentSummary;
  date: string;
  dateLabel: string;
  name: string;
  badge: { label: string; variant: BadgeVariant } | null;
  subtitle: string;
  format: string;
  timeControl: string;
  // Minutes, so time controls sort by length
  thinkingTime: number;
  rounds: number;
  players: number;
}

function toTournamentRow(summary: TournamentSummary, today: string): TournamentRow {
  const timing = tournamentTiming(summary, today);
  return {
    id: String(summary.number),
    summary,
    date: summary.date,
    dateLabel: formatDateRange(summary.date, summary.endDate, 'short'),
    name: summary.name,
    badge: timing ? TOURNAMENT_TIMING_BADGES[timing] : null,
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
    AdminControlsDirective,
    AdminToolbarComponent,
    BadgeComponent,
    ButtonComponent,
    CardComponent,
    DataTableComponent,
    DropdownComponent,
    EmptyStateComponent,
    LoadFailedComponent,
    MemberLinkComponent,
    PageHeaderComponent,
    PaginatorComponent,
    RouterLink,
    SkeletonComponent,
    TooltipDirective,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TournamentsPageComponent implements OnInit {
  private readonly deletion = inject(DeletionService);
  private readonly metaAndTitleService = inject(MetaAndTitleService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly store = inject(Store);

  private readonly dateCell = viewChild<CellTemplate>('dateCell');
  private readonly nameCell = viewChild<CellTemplate>('nameCell');
  private readonly timeControlCell = viewChild<CellTemplate>('timeControlCell');
  private readonly textCell = viewChild<CellTemplate>('textCell');

  protected readonly pageIcon = AwardIconComponent;
  protected readonly emptyIcon = FilterXIconComponent;
  protected readonly pageSizes = TOURNAMENTS_PAGE_SIZES;
  protected readonly trophies = TROPHIES;

  protected readonly addTournamentLink: InternalLink = {
    text: 'Add a tournament',
    internalPath: ['tournament', 'add'],
    icon: PlusCircleIconComponent,
  };

  protected readonly isAdmin = this.store.selectSignal(AuthSelectors.selectIsAdmin);

  private readonly allSummaries = this.store.selectSignal(
    TournamentsSelectors.selectSummaries,
  );

  // Soonest first, each with where its online registration stands right now
  protected readonly upcoming = computed(() => {
    const now = new Date();
    return this.allSummaries()
      .filter(summary => isUpcomingTournament(summary))
      .sort((a, b) => a.date.localeCompare(b.date) || a.number - b.number)
      .map(summary => ({
        summary,
        dateLabel: formatDateRange(summary.date, summary.endDate),
        format: TOURNAMENT_FORMAT_LABELS[summary.format],
        registration: this.registrationBadge(registrationStatus(summary, now), summary),
      }));
  });

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
    ...[...new Set(this.allSummaries().map(({ date }) => date.slice(0, 4)))]
      .sort((a, b) => b.localeCompare(a))
      .map(year => ({ value: year, label: year })),
  ]);

  protected readonly timeControlOptions = computed<SelectOption[]>(() => [
    { value: '', label: 'All time controls' },
    ...[...new Set(this.allSummaries().map(({ timeControl }) => timeControl))]
      .sort((a, b) => timeControlMinutes(a) - timeControlMinutes(b))
      .map(timeControl => ({ value: timeControl, label: timeControl })),
  ]);

  protected readonly formatOptions = computed<SelectOption[]>(() => {
    const played = new Set(this.allSummaries().map(({ format }) => format));
    return [
      { value: '', label: 'All formats' },
      ...(Object.keys(TOURNAMENT_FORMAT_LABELS) as TournamentFormat[])
        .filter(format => played.has(format))
        .map(format => ({ value: format, label: TOURNAMENT_FORMAT_LABELS[format] })),
    ];
  });

  protected readonly loading = computed(
    () => this.status() === 'loading' && !this.allSummaries().length,
  );

  protected readonly empty = computed(() => !this.loading() && !this.rows().length);

  private readonly filteredRows = computed<TournamentRow[]>(() => {
    const { year, timeControl, format } = this.filters();
    const { column, direction } = this.sortState();
    const order = direction === 'asc' ? 1 : -1;
    const today = clubToday();
    return this.allSummaries()
      .filter(
        summary =>
          (!year || summary.date.startsWith(year)) &&
          (!timeControl || summary.timeControl === timeControl) &&
          (!format || summary.format === format),
      )
      .map(summary => toTournamentRow(summary, today))
      .sort(
        (a, b) =>
          order * compareCells(a, b, column) ||
          Number(b.summary?.number) - Number(a.summary?.number),
      );
  });

  protected readonly filteredCount = computed(() => this.filteredRows().length);

  protected readonly rows = computed<TournamentRow[]>(() =>
    pageOf(this.filteredRows(), this.page(), this.pageSize()),
  );

  // Every tournament sizes the columns, so no filter, order or page moves them
  protected readonly sizingRows = computed(() => {
    const today = clubToday();
    return this.allSummaries().map(summary => toTournamentRow(summary, today));
  });

  protected readonly rowHref = ({ summary }: TournamentRow): string =>
    `/tournaments/${summary.number}`;

  protected readonly rowControls = ({ summary }: TournamentRow): AdminControlsConfig =>
    this.controlsFor(summary);

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

  public controlsFor(summary: TournamentSummary): AdminControlsConfig {
    return {
      buttonSize: 31,
      deleteCb: () => this.deletion.deleteTournament(summary),
      editPath: ['tournament', 'edit', String(summary.number)],
      itemName: summary.name,
    };
  }

  private registrationBadge(
    status: RegistrationStatus,
    { registrationOpens, registrationCloses }: TournamentSummary,
  ): { label: string; variant: BadgeVariant } | null {
    switch (status) {
      case 'open':
        return {
          label: `Registration open until ${formatDate(registrationCloses ?? undefined, 'short')}`,
          variant: 'success',
        };
      case 'not-open':
        return {
          label: `Registration opens ${formatDate(registrationOpens ?? undefined, 'short')}`,
          variant: 'info',
        };
      case 'closed':
        return { label: 'Registration closed', variant: 'default' };
      default:
        return null;
    }
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
