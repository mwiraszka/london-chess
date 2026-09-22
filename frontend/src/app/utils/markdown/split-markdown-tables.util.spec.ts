import { splitMarkdownTables } from './split-markdown-tables.util';

describe('splitMarkdownTables', () => {
  const crosstable = [
    '| # | Name | Rating | Round 1 | Rd 2 | Points |',
    '|--:|--|--:|--|--|--:|',
    '|1\t|Person, One\t|2048\t|W17 (b)\t|L2 (w)\t|5.0|',
    '|2\t|**Person, Two**\t|unr.\t|W12 (w)\t|W1 (b)\t| 4.5|',
    '|3\t|Person, Three\t|2090\t|H---\t|W26 (b)\t|4½|',
  ].join('\n');

  it('should keep the text around a table as markdown', () => {
    const segments = splitMarkdownTables(`## Results\n\n${crosstable}\n\nWell played.\n`);

    expect(segments.map(segment => segment.kind)).toEqual([
      'markdown',
      'table',
      'markdown',
    ]);
    expect(segments[0]).toEqual({ kind: 'markdown', text: '## Results\n' });
    expect(segments[2]).toEqual({ kind: 'markdown', text: '\nWell played.\n' });
  });

  it('should read the columns with their alignment, leaving rounds unsorted', () => {
    const [segment] = splitMarkdownTables(crosstable);

    expect(segment.kind === 'table' && segment.table.columns).toEqual([
      { key: 'c0', label: '#', align: 'right', sortable: true },
      { key: 'c1', label: 'Name', align: 'left', sortable: true },
      { key: 'c2', label: 'Rating', align: 'right', sortable: true },
      { key: 'c3', label: 'Round 1', align: 'left', sortable: false },
      { key: 'c4', label: 'Rd 2', align: 'left', sortable: false },
      { key: 'c5', label: 'Points', align: 'right', sortable: true },
    ]);
  });

  it('should sort a column of numbers as numbers, however they are written', () => {
    const [segment] = splitMarkdownTables(crosstable);
    const rows = segment.kind === 'table' ? segment.table.rows : [];

    expect(rows.map(row => row['c0'])).toEqual([1, 2, 3]);
    expect(rows.map(row => row['c2'])).toEqual([2048, null, 2090]);
    expect(rows.map(row => row['c5'])).toEqual([5, 4.5, 4.5]);
    expect(rows.map(row => row['c1'])).toEqual([
      'Person, One',
      '**Person, Two**',
      'Person, Three',
    ]);
  });

  it('should render each cell as markdown', () => {
    const [segment] = splitMarkdownTables(crosstable);
    const rows = segment.kind === 'table' ? segment.table.rows : [];

    expect(rows[1].html).toEqual({
      c0: '2',
      c1: '<strong>Person, Two</strong>',
      c2: 'unr.',
      c3: 'W12 (w)',
      c4: 'W1 (b)',
      c5: '4.5',
    });
    expect(rows.map(row => row.id)).toEqual(['row-0', 'row-1', 'row-2']);
  });

  it('should keep spacer rows, fill in missing cells and drop extra ones', () => {
    const [segment] = splitMarkdownTables(
      [
        '|Date|\tRound|\tClocks Start|',
        '|--|--|--|',
        '|August 20, 2026|\tRound 1|\t6:10 pm|',
        '||\tRound 2|',
        '|',
        'August 27, 2026|\tRound 3|\t6:10 pm|too many|',
      ].join('\n'),
    );
    const table = segment.kind === 'table' ? segment.table : null;

    expect(table?.rows.map(row => [row['c0'], row['c1'], row['c2']])).toEqual([
      ['August 20, 2026', 'Round 1', '6:10 pm'],
      ['', 'Round 2', ''],
      ['', '', ''],
      ['August 27, 2026', 'Round 3', '6:10 pm'],
    ]);
    expect(table?.columns.every(column => !column.sortable)).toBe(true);
  });

  it('should sort only tables of players or ratings, by their filled headings', () => {
    const [links] = splitMarkdownTables('||||\n|--|--|--|\n|[A](a)|[B](b)|[C](c)|');
    const [ratings] = splitMarkdownTables(
      '|Player|Old Rating|New Rating|\n|--|--:|--:|\n|Doe, John|1500|1520|',
    );

    expect(
      links.kind === 'table' && links.table.columns.map(({ sortable }) => sortable),
    ).toEqual([false, false, false]);
    expect(
      ratings.kind === 'table' && ratings.table.columns.map(({ sortable }) => sortable),
    ).toEqual([true, true, true]);
  });

  it('should leave lines of pipes without a delimiter row as markdown', () => {
    const segments = splitMarkdownTables('|a|b|\n|1|2|');

    expect(segments).toEqual([{ kind: 'markdown', text: '|a|b|\n|1|2|' }]);
  });
});
