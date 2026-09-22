import {
  DataTableColumn,
  DataTableSortState,
  DataTableComponent as EaDataTableComponent,
} from '@eagami/ui';

import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  Directive,
  ElementRef,
  Renderer2,
  RendererStyleFlags2,
  TemplateRef,
  afterNextRender,
  computed,
  inject,
  input,
  output,
  viewChild,
  viewChildren,
} from '@angular/core';

import { TextSkeletonComponent } from '@app/components/text-skeleton/text-skeleton.component';
import { AdminControlsConfig } from '@app/models';
import { AdminControlsService } from '@app/services';

export const NO_SORT: DataTableSortState = { column: '', direction: null };

// What a cell template is given: its row and value, and the column it renders
export interface DataTableCellContext<T> {
  $implicit: T;
  value: unknown;
  column: DataTableColumn<T>;
}

type CellTemplate<T> = TemplateRef<DataTableCellContext<T>>;

// A column may shape its own placeholder, where a line of text would not match its content
export interface LccDataTableColumn<T> extends DataTableColumn<T> {
  placeholderTemplate?: CellTemplate<T>;
}

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
  host: {
    '[class.data-table--full-width]': 'fullWidth()',
    '[class.data-table--sticky-head]': 'stickyHeader()',
    '(contextmenu)': 'onContextMenu($event)',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DataTableComponent<T extends { id: string }> {
  public readonly ariaLabel = input.required<string>({ alias: 'aria-label' });
  public readonly columns = input.required<LccDataTableColumn<T>[]>();
  public readonly data = input.required<T[]>();
  // Rows holding each column's widest content, which also shape the loading rows
  public readonly sizingRows = input<T[]>([]);
  public readonly loading = input(false);
  public readonly loadingRowCount = input(10);
  public readonly noDataText = input<string>();
  public readonly sort = input<DataTableSortState>(NO_SORT);
  public readonly rowHref = input<(row: T) => string | null>();
  public readonly clickable = input(false);
  // Fills its container rather than sitting centred at its content's width
  public readonly fullWidth = input(false);
  // Keeps the header in view for as long as any row is
  public readonly stickyHeader = input(true);
  // The admin controls of a row, opened by a right click on it
  public readonly rowControls = input<(row: T) => AdminControlsConfig | null>();

  public readonly sorted = output<DataTableSortState>();
  public readonly rowActivate = output<T>();

  private readonly cells = viewChildren(DataTableCellDirective<T>);
  private readonly table = viewChild(EaDataTableComponent, { read: ElementRef });

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly adminControls = inject(AdminControlsService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly renderer = inject(Renderer2);

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
      cellTemplate: cells.get(column.key),
    }));
  });

  protected readonly rowHrefWhenLoaded = computed(() =>
    this.loading() ? undefined : this.rowHref(),
  );

  // Rows are highlighted on hover only while they lead somewhere or act on a click
  protected readonly hoverable = computed(
    () => (this.clickable() && !this.loading()) || !!this.rowHrefWhenLoaded(),
  );

  // The sizing rows keep their content while loading, so the columns keep their widths
  protected isPlaceholder(row: T): boolean {
    return this.loading() && !this.sizingRows().includes(row);
  }

  protected cellContext(
    row: T,
    value: unknown,
    column: DataTableColumn<T>,
  ): DataTableCellContext<T> {
    return { $implicit: row, value, column };
  }

  constructor() {
    afterNextRender(() => this.trackHeadMetrics());
  }

  // The header rides over the rows on a scroll-driven animation, which the browser
  // runs against the scroller itself rather than a scroll listener that can only
  // catch up a frame later. All it needs from here are the two lengths the
  // animation is measured in, which change with the table rather than with scrolling:
  // how far the header may travel before it reaches the last row, and its own height,
  // which a row scrolled to the top of the page clears
  private trackHeadMetrics(): void {
    const table = this.table()?.nativeElement.querySelector('.ea-data-table__table');
    const head = table?.querySelector('.ea-data-table__head');
    if (!(table instanceof HTMLElement) || !(head instanceof HTMLElement)) {
      return;
    }
    let published = '';
    const update = () => {
      const height = head.offsetHeight;
      const travel = Math.max(table.offsetHeight - height, 0);
      if (`${height}/${travel}` === published) {
        return;
      }
      published = `${height}/${travel}`;
      this.setLength('--lcc-data-table-head-height', height);
      this.setLength('--lcc-data-table-head-travel', travel);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(table);
    this.destroyRef.onDestroy(() => observer.disconnect());
  }

  private setLength(name: string, value: number): void {
    this.renderer.setStyle(
      this.host.nativeElement,
      name,
      `${value}px`,
      RendererStyleFlags2.DashCase,
    );
  }

  protected onContextMenu(event: MouseEvent): void {
    const controlsFor = this.rowControls();
    const target = event.target instanceof Element ? event.target : null;
    const rowElement = target?.closest('.ea-data-table__body .ea-data-table__row');
    const id = rowElement?.querySelector('[data-row-id]')?.getAttribute('data-row-id');
    const row = this.rows().find(row => row.id === id);
    const config = controlsFor && row && !this.loading() ? controlsFor(row) : null;
    if (!rowElement || !config || window.getSelection()?.toString().trim()) {
      return;
    }
    event.preventDefault();
    this.adminControls.open(config, rowElement, undefined, 'center');
  }
}
