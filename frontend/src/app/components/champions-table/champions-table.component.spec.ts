import { MockStore, provideMockStore } from '@ngrx/store/testing';

import { DebugElement } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { ChampionshipTableRowData } from '@app/models';
import { query, queryAll } from '@app/utils';

import { ChampionsTableComponent } from './champions-table.component';

describe('ChampionsTableComponent', () => {
  let fixture: ComponentFixture<ChampionsTableComponent>;

  const championships: ChampionshipTableRowData[] = [
    { year: 2025, winners: [{ name: 'Jane Doe', peakRating: '2027' }], isCurrent: true },
    { year: 2024, winners: [{ name: 'John Doe', peakRating: '2195' }] },
    { year: 2023, winners: [{ name: 'Cancelled due to pandemic' }], isNote: true },
    ...Array.from({ length: 9 }, (_, index) => ({
      year: 2022 - index,
      winners: [
        { name: 'John Smith', peakRating: '2100' },
        { name: 'Jane Smith', peakRating: '2050' },
      ],
    })),
  ];

  const textOf = (element: DebugElement): string =>
    element.nativeElement.textContent.replace(/\s+/g, ' ').trim();

  const bodyRows = () =>
    queryAll(fixture.debugElement, '.ea-data-table__body .ea-data-table__row');

  const render = (inputs: Partial<Record<string, unknown>> = {}) => {
    const values = { championships, label: 'Past champions', ...inputs };
    Object.entries(values).forEach(([name, value]) =>
      fixture.componentRef.setInput(name, value),
    );
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChampionsTableComponent],
      providers: [provideMockStore(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(ChampionsTableComponent);
    TestBed.inject(MockStore);
  });

  it('should show the latest years first, all winners named', () => {
    render();

    expect(
      queryAll(fixture.debugElement, '.ea-data-table__cell--header').map(textOf),
    ).toEqual(['Year', 'Winner']);
    expect(bodyRows()).toHaveLength(10);
    expect(queryAll(bodyRows()[0], '.ea-data-table__cell').map(textOf)).toEqual([
      '2025',
      'Jane Doe(2027)',
    ]);
    expect(textOf(bodyRows()[3])).toBe('2022 John Smith(2100)Jane Smith(2050)');
  });

  it('should show every year on request, with the footnote', () => {
    render({ footnote: 'Club formed c.1965' });

    expect(query(fixture.debugElement, '.champions__footnote')).toBeFalsy();
    query(fixture.debugElement, '.champions__show-all').triggerEventHandler('clicked');
    fixture.detectChanges();

    expect(bodyRows()).toHaveLength(12);
    expect(query(fixture.debugElement, '.champions__show-all')).toBeFalsy();
    expect(textOf(query(fixture.debugElement, '.champions__footnote'))).toBe(
      'Club formed c.1965',
    );
  });

  it('should mark the reigning champion and a year not held', () => {
    render({ trophy: true, ratingNote: '*' });

    expect(query(bodyRows()[0], '.champions__trophy')).toBeTruthy();
    expect(query(bodyRows()[1], '.champions__trophy')).toBeFalsy();
    expect(queryAll(bodyRows()[0], '.champions__cell--current')).toHaveLength(2);
    expect(queryAll(bodyRows()[2], '.champions__cell--note')).toHaveLength(2);
    expect(textOf(bodyRows()[0])).toBe('2025 Jane Doe(2027*)');
  });

  it('should sort by year or winner', () => {
    render();

    query(fixture.debugElement, 'ea-data-table').triggerEventHandler('sorted', {
      column: 'year',
      direction: 'asc',
    });
    fixture.detectChanges();

    expect(
      bodyRows().map(row => textOf(queryAll(row, '.ea-data-table__cell')[0])),
    ).toEqual([
      '2016',
      '2017',
      '2018',
      '2019',
      '2020',
      '2021',
      '2022',
      '2023',
      '2024',
      '2025',
    ]);
  });
});
