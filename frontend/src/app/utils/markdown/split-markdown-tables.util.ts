import { marked } from 'marked';

export type MarkdownTableAlign = 'left' | 'center' | 'right';

export interface MarkdownTableColumn {
  key: string;
  label: string;
  align: MarkdownTableAlign;
  sortable: boolean;
}

export interface MarkdownTableRow {
  id: string;
  // Each cell rendered, by column key
  html: Record<string, string>;
  // Set on a row that is never shown, which sizes the first column for the heading of a
  // table drawn alongside
  heading?: { label: string; sortable: boolean };
  // Each cell's sort value, by column key
  [key: string]: unknown;
}

export interface MarkdownTable {
  columns: MarkdownTableColumn[];
  rows: MarkdownTableRow[];
}

export type MarkdownSegment =
  | { kind: 'markdown'; text: string }
  // The sizing rows are those of the tables drawn alongside, which this one fits as well
  | { kind: 'table'; table: MarkdownTable; sizingRows: MarkdownTableRow[] };

const DELIMITER_ROW = /^\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/;

// Only crosstables and ratings reports are worth sorting, and their headings say so
const SORTABLE_TABLE_HEADING = /^#$|\b(name|player|rating)\b/i;

// Round columns hold pairings, which have no order to sort by
const ROUND_HEADING = /^(round|rd\.?|r)\s*\d+$/i;

function splitCells(line: string): string[] {
  const trimmed = line.trim().replace(/^\|/, '').replace(/\|$/, '');
  return trimmed.split(/(?<!\\)\|/).map(cell => cell.replace(/\\\|/g, '|').trim());
}

function alignOf(delimiter: string): MarkdownTableAlign {
  const right = delimiter.endsWith(':');
  const left = delimiter.startsWith(':');
  return right && left ? 'center' : right ? 'right' : 'left';
}

// A number as a cell writes it: a score with a half, a dollar amount, or a rating
function numberOf(text: string): number | null {
  const cleaned = text
    .replace(/[$,\s]/g, '')
    .replace(/^½$/, '0.5')
    .replace(/½$/, '.5');
  return cleaned !== '' && Number.isFinite(Number(cleaned)) ? Number(cleaned) : null;
}

// A row need not start with a pipe, but it must hold one and it ends at a blank line
function isRow(line: string): boolean {
  return line.trim() !== '' && line.includes('|');
}

function isTableStart(lines: string[], index: number): boolean {
  return (
    isRow(lines[index]) &&
    index + 1 < lines.length &&
    DELIMITER_ROW.test(lines[index + 1].trim())
  );
}

const isSortableTable = (headings: string[]): boolean =>
  headings.some(heading => SORTABLE_TABLE_HEADING.test(heading));

const isSortableColumn = (label: string, tableSorts: boolean): boolean =>
  tableSorts && label !== '' && !ROUND_HEADING.test(label);

function parseTable(lines: string[]): MarkdownTable {
  const headings = splitCells(lines[0]);
  const aligns = splitCells(lines[1]).map(alignOf);
  const texts = lines
    .slice(2)
    .map(splitCells)
    .map(cells => headings.map((_, index) => cells[index] ?? ''));

  const sortable = isSortableTable(headings);
  const columns = headings.map((label, index) => ({
    key: `c${index}`,
    label,
    align: aligns[index] ?? 'left',
    sortable: isSortableColumn(label, sortable),
  }));
  // A column reads as numbers when most of its filled cells are numbers
  const numeric = columns.map((_, index) => {
    const filled = texts.map(cells => cells[index]).filter(cell => cell !== '');
    const numbers = filled.filter(cell => numberOf(cell) !== null);
    return numbers.length > filled.length / 2;
  });

  const rows = texts.map((cells, rowIndex) => {
    const row: MarkdownTableRow = { id: `row-${rowIndex}`, html: {} };
    cells.forEach((cell, index) => {
      const { key } = columns[index];
      row.html[key] = marked.parseInline(cell, { async: false });
      row[key] = numeric[index] ? numberOf(cell) : cell;
    });
    return row;
  });

  return { columns, rows };
}

const headingKey = (label: string): string =>
  label.trim().replace(/\s+/g, ' ').toLowerCase();

// The first column names each row, so only the headings after it tell what a table holds
function continuesTable(previous: MarkdownTable, table: MarkdownTable): boolean {
  const [, ...headings] = table.columns;
  const [, ...previousHeadings] = previous.columns;
  return (
    headings.length > 0 &&
    headings.length === previousHeadings.length &&
    headings.every(
      ({ label }, index) =>
        headingKey(label) === headingKey(previousHeadings[index].label),
    )
  );
}

type MarkdownTableSegment = Extract<MarkdownSegment, { kind: 'table' }>;

// The parts sort alike, and each sizes its columns to fit the rows and first heading of
// every part, so that all their columns line up
function alignParts(parts: MarkdownTableSegment[]): MarkdownTableSegment[] {
  if (parts.length < 2) {
    return parts;
  }

  const sorts = parts.some(({ table }) =>
    isSortableTable(table.columns.map(({ label }) => label)),
  );
  const tables = parts.map(({ table }) => ({
    ...table,
    columns: table.columns.map(column => ({
      ...column,
      sortable: isSortableColumn(column.label, sorts),
    })),
  }));
  const headings: MarkdownTableRow[] = tables.map(({ columns: [first] }, index) => ({
    id: `heading-${index}`,
    html: {},
    heading: { label: first.label, sortable: first.sortable },
  }));

  return tables.map((table, index) => ({
    kind: 'table',
    table,
    sizingRows: [
      ...headings,
      ...tables.flatMap((other, otherIndex) =>
        otherIndex === index
          ? []
          : other.rows.map(row => ({ ...row, id: `part-${otherIndex}-${row.id}` })),
      ),
    ],
  }));
}

// Tables set one after another with the same headings after the first column read as the
// parts of one table
function alignTableParts(segments: MarkdownSegment[]): MarkdownSegment[] {
  const groups: MarkdownTableSegment[][] = [];
  segments.forEach((segment, index) => {
    if (segment.kind !== 'table') {
      return;
    }
    const previous = segments[index - 1];
    const group = groups.at(-1);
    if (
      group &&
      previous?.kind === 'table' &&
      continuesTable(previous.table, segment.table)
    ) {
      group.push(segment);
    } else {
      groups.push([segment]);
    }
  });

  const aligned = new Map<MarkdownTableSegment, MarkdownTableSegment>();
  for (const group of groups) {
    alignParts(group).forEach((part, index) => aligned.set(group[index], part));
  }
  return segments.map(segment =>
    segment.kind === 'table' ? (aligned.get(segment) ?? segment) : segment,
  );
}

// Splits markdown into the text between its tables and the tables themselves
export function splitMarkdownTables(markdown: string): MarkdownSegment[] {
  const lines = markdown.split('\n');
  const segments: MarkdownSegment[] = [];
  let text: string[] = [];
  let index = 0;

  const flushText = () => {
    if (text.some(line => line.trim() !== '')) {
      segments.push({ kind: 'markdown', text: text.join('\n') });
    }
    text = [];
  };

  while (index < lines.length) {
    if (!isTableStart(lines, index)) {
      text.push(lines[index]);
      index += 1;
      continue;
    }
    const tableLines: string[] = [];
    while (index < lines.length && isRow(lines[index])) {
      tableLines.push(lines[index]);
      index += 1;
    }
    flushText();
    segments.push({ kind: 'table', table: parseTable(tableLines), sizingRows: [] });
  }
  flushText();

  return alignTableParts(segments);
}
