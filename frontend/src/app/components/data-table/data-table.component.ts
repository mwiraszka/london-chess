import {
  DataTableColumn,
  DataTableSortState,
  DataTableComponent as EaDataTableComponent,
} from '@eagami/ui';

import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  Directive,
  TemplateRef,
  computed,
  inject,
  input,
  output,
  viewChildren,
} from '@angular/core';

import { TextSkeletonComponent } from '@app/components/text-skeleton/text-skeleton.component';

export const NO_SORT: DataTableSortState = { column: '', direction: null };

type CellTemplate<T> = TemplateRef<{ $implicit: T; value: unknown }>;

// A cell template only receives its row and value, so each column gets a template of
// its own that knows which column it renders
@Directive({ selector: 'ng-template[lccDataTableCell]' })
export class DataTableCellDirective<T> {
  public readonly key = input.required<string>({ alias: 'lccDataTableCell' });
  public readonly template: CellTemplate<T> = inject(TemplateRef);
}

/**
 * The app's take on the library's data table: compact, striped, coloured like its
 * other tables, never wrapping a cell, scrolling sideways within itself, and sized
 * by the widest content each column can show. While loading it holds rows of
 * placeholders in columns still sized by that content.
 */
@Component({
  selector: 'lcc-data-table',
  templateUrl: './data-table.component.html',
  styleUrl: './data-table.component.scss',
  imports: [
    DataTableCellDirective,
    EaDataTableComponent,
    NgTemplateOutlet,
    TextSkeletonComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DataTableComponent<T extends { id: string }> {
  public readonly ariaLabel = input.required<string>({ alias: 'aria-label' });
  public readonly columns = input.required<DataTableColumn<T>[]>();
  public readonly data = input.required<T[]>();
  // Rows holding each column's widest content, which also shape the loading rows
  public readonly sizingRows = input<T[]>([]);
  public readonly loading = input(false);
  public readonly loadingRowCount = input(10);
  public readonly noDataText = input<string>();
  public readonly sort = input<DataTableSortState>(NO_SORT);
  public readonly rowHref = input<(row: T) => string | null>();
  public readonly clickable = input(false);

  public readonly sorted = output<DataTableSortState>();
  public readonly rowActivate = output<T>();

  private readonly cells = viewChildren(DataTableCellDirective<T>);

  protected readonly trackBy: keyof T = 'id';

  protected readonly rows = computed<T[]>(() => {
    if (!this.loading()) {
      return this.data();
    }
    const shape = this.sizingRows()[0] ?? this.data()[0];
    return shape
      ? Array.from({ length: this.loadingRowCount() }, (_, index) => ({
          ...shape,
          id: `loading-${index}`,
        }))
      : [];
  });

  protected readonly shownColumns = computed<DataTableColumn<T>[]>(() => {
    const cells = new Map(this.cells().map(cell => [cell.key(), cell.template]));
    return this.columns().map(column => ({
      ...column,
      cellTemplate: cells.get(column.key) ?? column.cellTemplate,
    }));
  });

  protected readonly rowHrefWhenLoaded = computed(() =>
    this.loading() ? undefined : this.rowHref(),
  );

  // The sizing rows keep their content while loading, so the columns keep their widths
  protected isPlaceholder(row: T): boolean {
    return this.loading() && !this.sizingRows().includes(row);
  }
}
