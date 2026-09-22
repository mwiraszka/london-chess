import { DebugElement } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { query, queryAll, splitMarkdownTables } from '@app/utils';

import { MarkdownTableComponent } from './markdown-table.component';

describe('MarkdownTableComponent', () => {
  let fixture: ComponentFixture<MarkdownTableComponent>;

  const [segment] = splitMarkdownTables(
    [
      '| # | Name | Rating | Round 1 | Points |',
      '|--:|--|--:|--|--:|',
      '|1|Person, One|2048|W17 (b)|5.0|',
      '|2|**Person, Two**|unr.|W12 (w)|4.5|',
      '|3|Person, Three|2090|H---|4½|',
    ].join('\n'),
  );

  const textOf = (element: DebugElement): string =>
    element.nativeElement.textContent.replace(/\s+/g, ' ').trim();

  const headers = () => queryAll(fixture.debugElement, '.ea-data-table__cell--header');

  const bodyRows = () =>
    queryAll(fixture.debugElement, '.ea-data-table__body .ea-data-table__row');

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MarkdownTableComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(MarkdownTableComponent);
    fixture.componentRef.setInput(
      'table',
      segment.kind === 'table' ? segment.table : null,
    );
    fixture.detectChanges();
  });

  it('should show the table with its headings, alignment and rendered cells', () => {
    expect(headers().map(textOf)).toEqual(['#', 'Name', 'Rating', 'Round 1', 'Points']);
    expect(
      headers().map(header => !!header.classes['ea-data-table__cell--align-right']),
    ).toEqual([true, false, true, false, true]);
    expect(query(bodyRows()[1], 'strong').nativeElement.textContent).toBe('Person, Two');
    expect(
      query(fixture.debugElement, 'ea-data-table').componentInstance.ariaLabel(),
    ).toBe('#, Name, Rating, Round 1, Points');
  });

  it('should let every column but the rounds be sorted', () => {
    expect(
      headers().map(header => !!header.classes['ea-data-table__cell--sortable']),
    ).toEqual([true, true, true, false, true]);
  });

  it('should sort numbers by size, with the unrated first', () => {
    query(fixture.debugElement, 'ea-data-table').triggerEventHandler('sorted', {
      column: 'c2',
      direction: 'asc',
    });
    fixture.detectChanges();

    expect(
      bodyRows().map(row => textOf(queryAll(row, '.ea-data-table__cell')[2])),
    ).toEqual(['unr.', '2048', '2090']);
  });
});
