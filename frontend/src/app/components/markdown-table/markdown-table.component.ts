import { DataTableColumn, DataTableSortState } from '@eagami/ui';

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
  DataTableCellContext,
  DataTableComponent,
  NO_SORT,
} from '@app/components/data-table/data-table.component';
import { MarkdownTable, MarkdownTableRow } from '@app/utils';

@Component({
  selector: 'lcc-markdown-table',
  templateUrl: './markdown-table.component.html',
  styleUrl: './markdown-table.component.scss',
  imports: [DataTableComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MarkdownTableComponent {
  public readonly table = input.required<MarkdownTable>();

  private readonly cell =
    viewChild.required<TemplateRef<DataTableCellContext<MarkdownTableRow>>>('cell');

  protected readonly sort = signal<DataTableSortState>(NO_SORT);

  protected readonly label = computed(() =>
    this.table()
      .columns.map(({ label }) => label)
      .join(', '),
  );

  protected readonly columns = computed<DataTableColumn<MarkdownTableRow>[]>(() =>
    this.table().columns.map(({ key, label, align, sortable }) => ({
      key,
      label,
      align,
      sortable,
      cellTemplate: this.cell(),
    })),
  );

  protected readonly rows = computed(() => this.table().rows);

  public onSorted(sort: DataTableSortState): void {
    this.sort.set(sort);
  }
}
