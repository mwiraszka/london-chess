import {
  ButtonComponent,
  DataTableColumn,
  DataTableSortState,
  TrophyIconComponent,
} from '@eagami/ui';

import {
  ChangeDetectionStrategy,
  Component,
  TemplateRef,
  computed,
  input,
  signal,
  viewChild,
} from '@angular/core';

import {
  DataTableComponent,
  NO_SORT,
} from '@app/components/data-table/data-table.component';
import { MemberLinkComponent } from '@app/components/member-link/member-link.component';
import { ChampionshipTableRowData } from '@app/models';

export interface ChampionRow {
  id: string;
  championship: ChampionshipTableRowData;
  year: number;
  winner: string;
}

// Enough of the latest years to read at a glance, before the rest are asked for
const SHOWN_AT_FIRST = 10;

type CellTemplate = TemplateRef<{ $implicit: ChampionRow; value: unknown }>;

@Component({
  selector: 'lcc-champions-table',
  templateUrl: './champions-table.component.html',
  styleUrl: './champions-table.component.scss',
  imports: [
    ButtonComponent,
    DataTableComponent,
    MemberLinkComponent,
    TrophyIconComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChampionsTableComponent {
  public readonly championships = input.required<ChampionshipTableRowData[]>();
  public readonly label = input.required<string>();
  // Whether the reigning champion's row carries the trophy
  public readonly trophy = input(false);
  // A mark after each peak rating, explained by the footnote
  public readonly ratingNote = input('');
  // Read under the table once every year is shown
  public readonly footnote = input('');

  private readonly yearCell = viewChild.required<CellTemplate>('yearCell');
  private readonly winnerCell = viewChild.required<CellTemplate>('winnerCell');

  protected readonly sort = signal<DataTableSortState>(NO_SORT);
  protected readonly showsAll = signal(false);

  protected readonly rows = computed<ChampionRow[]>(() =>
    this.championships()
      .slice(0, this.showsAll() ? undefined : SHOWN_AT_FIRST)
      .map(championship => ({
        id: String(championship.year),
        championship,
        year: championship.year,
        winner: championship.winners.map(({ name }) => name).join(', '),
      })),
  );

  protected readonly hasMore = computed(
    () => !this.showsAll() && this.championships().length > SHOWN_AT_FIRST,
  );

  protected readonly columns = computed<DataTableColumn<ChampionRow>[]>(() => [
    { key: 'year', label: 'Year', sortable: true, cellTemplate: this.yearCell() },
    {
      key: 'winner',
      label: 'Winner',
      sortable: true,
      // Takes the width the year does not need
      width: '100%',
      cellTemplate: this.winnerCell(),
    },
  ]);

  protected ratingLabel({ peakRating }: { peakRating?: string }): string {
    return `(${peakRating}${this.ratingNote()})`;
  }

  public onSorted(sort: DataTableSortState): void {
    this.sort.set(sort);
  }

  public onShowAll(): void {
    this.showsAll.set(true);
  }
}
