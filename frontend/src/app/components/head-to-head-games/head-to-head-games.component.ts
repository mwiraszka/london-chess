import {
  DataTableColumn,
  DataTableSortState,
  PaginatorComponent,
  PaginatorState,
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
  HEAD_TO_HEAD_INITIAL_SORT,
  HEAD_TO_HEAD_PAGE_SIZES,
} from '@app/constants/head-to-head';
import { HeadToHeadGame, HeadToHeadGameRow, HeadToHeadSide } from '@app/models';
import { compareCells, headToHeadGameRow, pageOf } from '@app/utils';

type CellTemplate = TemplateRef<{ $implicit: HeadToHeadGameRow; value: unknown }>;

/**
 * Every game two members played each other, each opening its game in the archives, or its
 * tournament when its moves were not kept.
 */
@Component({
  selector: 'lcc-head-to-head-games',
  templateUrl: './head-to-head-games.component.html',
  styleUrl: './head-to-head-games.component.scss',
  imports: [DataTableComponent, PaginatorComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeadToHeadGamesComponent {
  public readonly games = input.required<HeadToHeadGame[]>();
  public readonly names = input.required<Record<HeadToHeadSide, string>>();

  private readonly router = inject(Router);

  private readonly dateCell = viewChild<CellTemplate>('dateCell');
  private readonly tournamentCell = viewChild<CellTemplate>('tournamentCell');
  private readonly roundCell = viewChild<CellTemplate>('roundCell');
  private readonly whiteCell = viewChild<CellTemplate>('whiteCell');
  private readonly resultCell = viewChild<CellTemplate>('resultCell');

  protected readonly pageSizes = HEAD_TO_HEAD_PAGE_SIZES;

  protected readonly sortState = signal<DataTableSortState>(HEAD_TO_HEAD_INITIAL_SORT);

  private readonly allRows = computed(() => {
    const { column, direction } = this.sortState();
    const order = direction === 'desc' ? -1 : 1;
    const names = this.names();
    return this.games()
      .map((game, index) => headToHeadGameRow(game, index, names))
      .sort((a, b) => order * compareCells(a, b, column));
  });

  protected readonly gameCount = computed(() => this.allRows().length);

  // Every game sizes the columns, so no order or page moves them
  protected readonly sizingRows = this.allRows;

  protected readonly pageSize = signal(HEAD_TO_HEAD_PAGE_SIZES[0]);

  // A new pairing or order starts at the first page
  protected readonly page = linkedSignal<[HeadToHeadGame[], DataTableSortState], number>({
    source: () => [this.games(), this.sortState()],
    computation: () => 1,
  });

  protected readonly rows = computed(() =>
    pageOf(this.allRows(), this.page(), this.pageSize()),
  );

  protected readonly columns = computed<DataTableColumn<HeadToHeadGameRow>[]>(() => {
    const cells = {
      date: this.dateCell(),
      tournament: this.tournamentCell(),
      round: this.roundCell(),
      white: this.whiteCell(),
      result: this.resultCell(),
    };
    if (
      !cells.date ||
      !cells.tournament ||
      !cells.round ||
      !cells.white ||
      !cells.result
    ) {
      return [];
    }
    return [
      {
        key: 'date',
        label: 'Date',
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
        key: 'round',
        label: 'Round',
        sortable: true,
        align: 'right',
        cellTemplate: cells.round,
      },
      { key: 'white', label: 'White', sortable: true, cellTemplate: cells.white },
      { key: 'result', label: 'Result', sortable: true, cellTemplate: cells.result },
    ];
  });

  protected readonly rowHref = ({ game }: HeadToHeadGameRow): string | null =>
    game.gameId
      ? `/game-archives/${game.gameId}`
      : game.tournamentNumber !== null
        ? `/tournaments/${game.tournamentNumber}`
        : null;

  public onSorted({ column, direction }: DataTableSortState): void {
    this.sortState.set(direction ? { column, direction } : HEAD_TO_HEAD_INITIAL_SORT);
  }

  public onPageChanged({ page, pageSize }: PaginatorState): void {
    this.pageSize.set(pageSize);
    this.page.set(page);
  }

  public onOpenGame(row: HeadToHeadGameRow): void {
    const href = this.rowHref(row);
    if (href) {
      this.router.navigateByUrl(href);
    }
  }
}
