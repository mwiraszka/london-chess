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
  // Each cell's sort value, by column key
  [key: string]: unknown;
}

export interface MarkdownTable {
  columns: MarkdownTableColumn[];
  rows: MarkdownTableRow[];
}

export type MarkdownSegment =
  { kind: 'markdown'; text: string } | { kind: 'table'; table: MarkdownTable };

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

function parseTable(lines: string[]): MarkdownTable {
  const headings = splitCells(lines[0]);
  const aligns = splitCells(lines[1]).map(alignOf);
  const texts = lines
    .slice(2)
    .map(splitCells)
    .map(cells => headings.map((_, index) => cells[index] ?? ''));

  const sortable = headings.some(heading => SORTABLE_TABLE_HEADING.test(heading));
  const columns = headings.map((label, index) => ({
    key: `c${index}`,
    label,
    align: aligns[index] ?? 'left',
    sortable: sortable && label !== '' && !ROUND_HEADING.test(label),
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
    segments.push({ kind: 'table', table: parseTable(tableLines) });
  }
  flushText();

  return segments;
}
