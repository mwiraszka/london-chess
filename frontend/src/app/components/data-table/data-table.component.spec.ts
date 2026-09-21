import { DataTableColumn, DataTableSortState, PaginatorComponent } from '@eagami/ui';

import { Component, TemplateRef, signal, viewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { query, queryAll } from '@app/utils';

import { DataTableComponent } from './data-table.component';

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
      [clickable]="true"
      [columns]="columns()"
      [data]="rows()"
      [loading]="loading()"
      [loadingRowCount]="4"
      [rowHref]="rowHref"
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
  `,
  imports: [DataTableComponent, PaginatorComponent],
})
class HostComponent {
  readonly nameCell =
    viewChild.required<TemplateRef<{ $implicit: Row; value: unknown }>>('nameCell');

  readonly rows = signal<Row[]>([
    { id: 'a', name: 'Ann', score: 3 },
    { id: 'b', name: 'Bob', score: 1 },
  ]);
  readonly loading = signal(false);
  readonly sort = signal<DataTableSortState>({ column: '', direction: null });
  readonly sizingRows: Row[] = [{ id: 'widest', name: 'Bartholomew', score: 100 }];
  readonly rowHref = (row: Row): string => `/rows/${row.id}`;
  readonly activated: Row[] = [];
  readonly sorts: DataTableSortState[] = [];

  readonly columns = () => {
    const columns: DataTableColumn<Row>[] = [
      { key: 'name', label: 'Name', sortable: true, cellTemplate: this.nameCell() },
      { key: 'score', label: 'Score', align: 'right' },
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
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should show the rows through the given columns, sized by the sizing rows', () => {
    const table = query(fixture.debugElement, 'ea-data-table');

    expect(bodyRows()).toHaveLength(2);
    expect(
      queryAll(bodyRows()[0], '.name').map(b => b.nativeElement.textContent),
    ).toEqual(['Ann']);
    expect(table.componentInstance.sizingRows()).toBe(host.sizingRows);
    expect(table.componentInstance.nowrap()).toBe(true);
    expect(table.componentInstance.striped()).toBe(true);
    expect(table.componentInstance.density()).toBe('compact');
    expect(table.componentInstance.ariaLabel()).toBe('Rows');
  });

  it('should link each row and pass on its activation', () => {
    expect(query(bodyRows()[1], 'a.ea-data-table__row-link').attributes['href']).toBe(
      '/rows/b',
    );

    bodyRows()[1].triggerEventHandler('click');

    expect(host.activated).toEqual([host.rows()[1]]);
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
      expect(queryAll(bodyRows()[0], 'lcc-text-skeleton')).toHaveLength(2);
      expect(query(bodyRows()[0], '.name')).toBeFalsy();
    });

    it('should neither link nor activate the placeholder rows', () => {
      bodyRows()[0].triggerEventHandler('click');

      expect(query(fixture.debugElement, 'a.ea-data-table__row-link')).toBeFalsy();
      expect(host.activated).toEqual([]);
    });
  });
});
