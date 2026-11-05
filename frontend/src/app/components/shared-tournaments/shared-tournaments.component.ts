import {
  DataTableColumn,
  DataTableSortState,
  PaginatorComponent,
  PaginatorState,
  PieChartComponent,
  PieChartSlice,
} from '@eagami/ui';

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
import { Router } from '@angular/router';

import { DataTableComponent } from '@app/components/data-table/data-table.component';
import {
  HEAD_TO_HEAD_COLORS,
  HEAD_TO_HEAD_INITIAL_SORT,
  HEAD_TO_HEAD_PAGE_SIZES,
  SHARED_TOURNAMENTS_DONUT_HEIGHT,
} from '@app/constants/head-to-head';
import {
  HeadToHeadSide,
  MemberTournamentResult,
  SharedTournament,
  SharedTournamentRow,
} from '@app/models';
import { compareCells, pageOf, sharedTournamentRow, sharedTournaments } from '@app/utils';

type CellTemplate = TemplateRef<{ $implicit: SharedTournamentRow; value: unknown }>;

/**
 * The tournaments two members both played, with where each finished and how often each
 * finished above the other in a section they shared.
 */
@Component({
  selector: 'lcc-shared-tournaments',
  templateUrl: './shared-tournaments.component.html',
  styleUrl: './shared-tournaments.component.scss',
  imports: [DataTableComponent, PaginatorComponent, PieChartComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SharedTournamentsComponent {
  public readonly firstResults = input.required<MemberTournamentResult[]>();
  public readonly secondResults = input.required<MemberTournamentResult[]>();
  public readonly names = input.required<Record<HeadToHeadSide, string>>();

  private readonly router = inject(Router);

  private readonly dateCell = viewChild<CellTemplate>('dateCell');
  private readonly tournamentCell = viewChild<CellTemplate>('tournamentCell');
  private readonly firstCell = viewChild<CellTemplate>('firstCell');
  private readonly secondCell = viewChild<CellTemplate>('secondCell');

  protected readonly pageSizes = HEAD_TO_HEAD_PAGE_SIZES;
  protected readonly donutHeight = SHARED_TOURNAMENTS_DONUT_HEIGHT;

  private readonly shared = computed(() =>
    sharedTournaments(this.firstResults(), this.secondResults()),
  );

  protected readonly higherSlices = computed<PieChartSlice[]>(() => {
    const { first, second } = this.names();
    const count = (side: HeadToHeadSide): number =>
      this.shared().filter(({ higher }) => higher === side).length;
    return [
      { label: first, value: count('first'), color: HEAD_TO_HEAD_COLORS.first },
      { label: second, value: count('second'), color: HEAD_TO_HEAD_COLORS.second },
    ];
  });

  protected readonly hasPlaces = computed(() =>
    this.higherSlices().some(({ value }) => value > 0),
  );

  protected readonly sortState = signal<DataTableSortState>(HEAD_TO_HEAD_INITIAL_SORT);

  private readonly allRows = computed(() => {
    const { column, direction } = this.sortState();
    const order = direction === 'desc' ? -1 : 1;
    return this.shared()
      .map(sharedTournamentRow)
      .sort((a, b) => order * compareCells(a, b, column));
  });

  protected readonly tournamentCount = computed(() => this.allRows().length);

  // Every tournament sizes the columns, so no order or page moves them
  protected readonly sizingRows = this.allRows;

  protected readonly pageSize = signal(HEAD_TO_HEAD_PAGE_SIZES[0]);

  // A new pairing or order starts at the first page
  protected readonly page = linkedSignal<
    [SharedTournament[], DataTableSortState],
    number
  >({
    source: () => [this.shared(), this.sortState()],
    computation: () => 1,
  });

  protected readonly rows = computed(() =>
    pageOf(this.allRows(), this.page(), this.pageSize()),
  );

  protected readonly columns = computed<DataTableColumn<SharedTournamentRow>[]>(() => {
    const cells = {
      date: this.dateCell(),
      tournament: this.tournamentCell(),
      first: this.firstCell(),
      second: this.secondCell(),
    };
    if (!cells.date || !cells.tournament || !cells.first || !cells.second) {
      return [];
    }
    const { first, second } = this.names();
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
      {
        key: 'firstPlace',
        label: first,
        sortable: true,
        align: 'right',
        cellTemplate: cells.first,
      },
      {
        key: 'secondPlace',
        label: second,
        sortable: true,
        align: 'right',
        cellTemplate: cells.second,
      },
    ];
  });

  protected readonly rowHref = ({ shared }: SharedTournamentRow): string =>
    `/tournaments/${shared.tournament.number}`;

  public onSorted({ column, direction }: DataTableSortState): void {
    this.sortState.set(direction ? { column, direction } : HEAD_TO_HEAD_INITIAL_SORT);
  }

  public onPageChanged({ page, pageSize }: PaginatorState): void {
    this.pageSize.set(pageSize);
    this.page.set(page);
  }

  public onOpenTournament({ shared }: SharedTournamentRow): void {
    this.router.navigate(['/tournaments', shared.tournament.number]);
  }
}
