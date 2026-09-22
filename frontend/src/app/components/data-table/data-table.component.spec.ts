import { DataTableSortState, PaginatorComponent } from '@eagami/ui';

import { Component, TemplateRef, signal, viewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { AdminControlsConfig } from '@app/models';
import { AdminControlsService } from '@app/services';
import { query, queryAll } from '@app/utils';

import {
  DataTableCellContext,
  DataTableComponent,
  LccDataTableColumn,
} from './data-table.component';

interface Row {
  id: string;
  name: string;
  score: number;
}

@Component({
  template: `
    <lcc-data-table
      aria-label="Rows"
      noDataText="Nothing here."
      [clickable]="clickable()"
      [columns]="columns()"
      [data]="rows()"
      [loading]="loading()"
      [loadingRowCount]="4"
      [rowControls]="rowControls"
      [rowHref]="rowHref()"
      [sizingRows]="sizingRows"
      [sort]="sort()"
      (rowActivate)="activated.push($event)"
      (sorted)="sorts.push($event)">
      <ea-paginator
        size="sm"
        [page]="1"
        [pageSize]="10"
        [totalItems]="2" />
    </lcc-data-table>

    <ng-template
      #nameCell
      let-row>
      <b class="name">{{ row.name }}</b>
    </ng-template>

    <ng-template #namePlaceholder>
      <i class="name-placeholder"></i>
    </ng-template>
  `,
  imports: [DataTableComponent, PaginatorComponent],
})
class HostComponent {
  readonly nameCell =
    viewChild.required<TemplateRef<{ $implicit: Row; value: unknown }>>('nameCell');
  readonly namePlaceholder =
    viewChild.required<TemplateRef<DataTableCellContext<Row>>>('namePlaceholder');

  readonly rows = signal<Row[]>([
    { id: 'a', name: 'Ann', score: 3 },
    { id: 'b', name: 'Bob', score: 1 },
  ]);
  readonly loading = signal(false);
  readonly clickable = signal(true);
  readonly sort = signal<DataTableSortState>({ column: '', direction: null });
  readonly sizingRows: Row[] = [{ id: 'widest', name: 'Bartholomew', score: 100 }];
  readonly rowHref = signal<((row: Row) => string) | undefined>(row => `/rows/${row.id}`);
  readonly rowControls = (row: Row): AdminControlsConfig => ({
    buttonSize: 31,
    deleteCb: () => undefined,
    itemName: row.name,
  });
  readonly activated: Row[] = [];
  readonly sorts: DataTableSortState[] = [];

  readonly columns = () => {
    const columns: LccDataTableColumn<Row>[] = [
      {
        key: 'name',
        label: 'Name',
        sortable: true,
        cellTemplate: this.nameCell(),
        placeholderTemplate: this.namePlaceholder(),
      },
      { key: 'score', label: 'Score', align: 'right', format: score => `${score} pts` },
    ];
    return columns;
  };
}

describe('DataTableComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  const bodyRows = () =>
    queryAll(fixture.debugElement, '.ea-data-table__body .ea-data-table__row');

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [
        provideRouter([]),
        { provide: AdminControlsService, useValue: { open: vi.fn() } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    // The host stands in for the page's scrolling area
    fixture.nativeElement.style.overflowY = 'auto';
    fixture.detectChanges();
  });

  it('should show the rows through the given columns, sized by the sizing rows', () => {
    const table = query(fixture.debugElement, 'ea-data-table');

    expect(bodyRows()).toHaveLength(2);
    expect(
      queryAll(bodyRows()[0], '.name').map(b => b.nativeElement.textContent),
    ).toEqual(['Ann']);
    expect(
      queryAll(bodyRows()[0], '.ea-data-table__cell')[1].nativeElement.textContent.trim(),
    ).toBe('3 pts');
    expect(query(fixture.debugElement, '.ea-data-table__sizing .name')).toBeTruthy();
    expect(table.componentInstance.sizingRows()).toBe(host.sizingRows);
    expect(table.componentInstance.nowrap()).toBe(true);
    expect(table.componentInstance.striped()).toBe(true);
    expect(table.componentInstance.density()).toBe('compact');
    expect(table.componentInstance.ariaLabel()).toBe('Rows');
  });

  it('should highlight rows on hover only while they link or act', () => {
    const table = query(fixture.debugElement, 'ea-data-table');

    expect(table.componentInstance.hoverable()).toBe(true);

    host.clickable.set(false);
    host.rowHref.set(undefined);
    fixture.detectChanges();

    expect(table.componentInstance.hoverable()).toBe(false);
  });

  it('should not highlight placeholder rows on hover', () => {
    const table = query(fixture.debugElement, 'ea-data-table');

    host.loading.set(true);
    fixture.detectChanges();

    expect(table.componentInstance.hoverable()).toBe(false);
  });

  it('should sit at its content width unless asked to fill its container', () => {
    expect(
      query(fixture.debugElement, 'lcc-data-table').classes['data-table--full-width'],
    ).toBeFalsy();
  });

  it('should link each row and pass on its activation', () => {
    expect(query(bodyRows()[1], 'a.ea-data-table__row-link').attributes['href']).toBe(
      '/rows/b',
    );

    bodyRows()[1].triggerEventHandler('click');

    expect(host.activated).toEqual([host.rows()[1]]);
  });

  it('should offer a row its controls on a right click', () => {
    const openSpy = vi.mocked(TestBed.inject(AdminControlsService).open);
    const event = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });

    query(bodyRows()[1], '.name').nativeElement.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(openSpy).toHaveBeenCalledWith(
      expect.objectContaining({ itemName: 'Bob' }),
      bodyRows()[1].nativeElement,
      undefined,
      'center',
    );
  });

  it('should keep the header in view while the rows scroll past it', () => {
    const scroller: HTMLElement = fixture.nativeElement;
    const table: HTMLElement = query(
      fixture.debugElement,
      '.ea-data-table__table',
    ).nativeElement;
    const head: HTMLElement = query(
      fixture.debugElement,
      '.ea-data-table__head',
    ).nativeElement;
    Object.defineProperty(table, 'offsetHeight', { value: 300 });
    Object.defineProperty(head, 'offsetHeight', { value: 40 });
    vi.spyOn(scroller, 'getBoundingClientRect').mockReturnValue({ top: 0 } as DOMRect);
    const tableRect = vi.spyOn(table, 'getBoundingClientRect');

    tableRect.mockReturnValue({ top: -100 } as DOMRect);
    scroller.dispatchEvent(new Event('scroll'));
    expect(head.style.transform).toBe('translateY(100px)');

    tableRect.mockReturnValue({ top: -280 } as DOMRect);
    scroller.dispatchEvent(new Event('scroll'));
    expect(head.style.transform).toBe('translateY(260px)');

    tableRect.mockReturnValue({ top: 20 } as DOMRect);
    scroller.dispatchEvent(new Event('scroll'));
    expect(head.style.transform).toBe('');
  });

  it('should pass on a sort', () => {
    query(fixture.debugElement, 'ea-data-table').triggerEventHandler('sorted', {
      column: 'score',
      direction: 'desc',
    });

    expect(host.sorts).toEqual([{ column: 'score', direction: 'desc' }]);
  });

  it('should project the paginator into the table', () => {
    expect(query(fixture.debugElement, 'ea-data-table ea-paginator')).toBeTruthy();
  });

  describe('while loading', () => {
    beforeEach(() => {
      host.loading.set(true);
      fixture.detectChanges();
    });

    it('should hold placeholder rows shaped like the widest content', () => {
      expect(bodyRows()).toHaveLength(4);
      expect(queryAll(bodyRows()[0], 'lcc-text-skeleton')).toHaveLength(1);
      expect(query(bodyRows()[0], '.name-placeholder')).toBeTruthy();
      expect(query(bodyRows()[0], '.name')).toBeFalsy();
    });

    it('should keep the columns sized by the widest content', () => {
      const sizingCells = queryAll(
        fixture.debugElement,
        '.ea-data-table__sizing .ea-data-table__cell',
      );

      expect(query(sizingCells[0], '.name').nativeElement.textContent).toBe(
        'Bartholomew',
      );
      expect(sizingCells[1].nativeElement.textContent.trim()).toBe('100 pts');
      expect(
        query(fixture.debugElement, '.ea-data-table__sizing lcc-text-skeleton'),
      ).toBeFalsy();
    });

    it('should neither link nor activate the placeholder rows', () => {
      bodyRows()[0].triggerEventHandler('click');

      expect(query(fixture.debugElement, 'a.ea-data-table__row-link')).toBeFalsy();
      expect(host.activated).toEqual([]);
    });
  });
});
