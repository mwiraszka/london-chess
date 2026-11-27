export interface EmailContent {
  subject: string;
  text: string;
  html: string;
}

interface EmailLink {
  href: string;
  label: string;
}

type EmailInline = string | EmailLink;

interface EmailTable {
  kind: 'table';
  rows: string[][];
  columns?: string[];
}

export interface EmailTableGroup {
  label: string;
  rows: string[][];
}

interface EmailGroupedTable {
  kind: 'groupedTable';
  groups: EmailTableGroup[];
  columns: string[];
}

export type EmailBlock =
  | { kind: 'paragraph'; parts: EmailInline[] }
  | { kind: 'code'; value: string }
  | EmailTable
  | EmailGroupedTable;

// The live site's copy, so emails sent during local development show the logo too
const LOGO_URL = 'https://londonchess.ca/assets/lcc-logo.png';

// 97px high keeps the 387x374 logo in proportion
const LOGO_WIDTH = 100;
const LOGO_HEIGHT = 97;

const SPACING = '16px';

const STYLES = {
  container: 'font-family: Arial, sans-serif; color: #222;',
  logo: `display: block; margin: 0 0 ${SPACING}; border: 0;`,
  heading: `margin: 0 0 ${SPACING};`,
  code: 'font-size: 24px; font-weight: bold; letter-spacing: 2px; font-family: monospace;',
  table: 'border-collapse: collapse;',
  cell: `padding: 4px ${SPACING} 4px 0;`,
  headerCell: `padding: 4px ${SPACING} 4px 0; font-weight: bold; text-align: left;`,
  groupCell: `padding: 4px ${SPACING} 4px 0; vertical-align: top;`,
} as const;

// Renders the HTML and plain-text versions of an email from the same blocks
export function buildEmail(
  subject: string,
  heading: string,
  blocks: EmailBlock[],
): EmailContent {
  const lastIndex = blocks.length - 1;
  const body = blocks
    .map((block, index) => blockHtml(block, index === lastIndex ? '0' : `0 0 ${SPACING}`))
    .join('');

  const logo = `<img src="${LOGO_URL}" alt="London Chess logo" width="${LOGO_WIDTH}" height="${LOGO_HEIGHT}" style="${STYLES.logo}">`;
  const title = `<h2 style="${STYLES.heading}">${escapeHtml(heading)}</h2>`;

  return {
    subject,
    text: [heading, ...blocks.map(blockText)].join('\n\n'),
    html: `<div style="${STYLES.container}">${logo}${title}${body}</div>`,
  };
}

export function paragraph(...parts: EmailInline[]): EmailBlock {
  return { kind: 'paragraph', parts };
}

// For a password or code the reader needs to copy
export function codeBlock(value: string): EmailBlock {
  return { kind: 'code', value };
}

// Without column headings, the first cell of each row labels it
export function table(rows: string[][], columns?: string[]): EmailBlock {
  return { kind: 'table', rows, columns };
}

// Names each group once beside all of its rows, the first column heading being the group's
export function groupedTable(groups: EmailTableGroup[], columns: string[]): EmailBlock {
  return { kind: 'groupedTable', groups, columns };
}

export function link(url: string): EmailLink {
  return { href: url, label: url };
}

export function mailtoLink(address: string): EmailLink {
  return { href: `mailto:${address}`, label: address };
}

function blockHtml(block: EmailBlock, margin: string): string {
  switch (block.kind) {
    case 'paragraph':
      return `<p style="margin: ${margin};">${block.parts.map(inlineHtml).join('')}</p>`;
    case 'code':
      return `<p style="margin: ${margin}; ${STYLES.code}">${escapeHtml(block.value)}</p>`;
    case 'table':
      return `<table style="margin: ${margin}; ${STYLES.table}">${tableRowsHtml(block)}</table>`;
    case 'groupedTable':
      return `<table style="margin: ${margin}; ${STYLES.table}">${groupedTableRowsHtml(block)}</table>`;
  }
}

function tableRowsHtml({ rows, columns }: EmailTable): string {
  const header = columns ? columnsHtml(columns) : '';
  const body = rows
    .map(([label, ...cells]) => {
      const labelCell = columns
        ? `<td style="${STYLES.cell}">${escapeHtml(label)}</td>`
        : `<th scope="row" style="${STYLES.headerCell}">${escapeHtml(label)}</th>`;
      return `<tr>${labelCell}${cellsHtml(cells)}</tr>`;
    })
    .join('');
  return header + body;
}

function groupedTableRowsHtml({ groups, columns }: EmailGroupedTable): string {
  const body = groups
    .flatMap(({ label, rows }) =>
      rows.map((cells, index) => {
        const labelCell = index
          ? ''
          : `<td rowspan="${rows.length}" style="${STYLES.groupCell}">${escapeHtml(label)}</td>`;
        return `<tr>${labelCell}${cellsHtml(cells)}</tr>`;
      }),
    )
    .join('');
  return columnsHtml(columns) + body;
}

function columnsHtml(columns: string[]): string {
  return `<tr>${columns.map(column => `<th scope="col" style="${STYLES.headerCell}">${escapeHtml(column)}</th>`).join('')}</tr>`;
}

function cellsHtml(cells: string[]): string {
  return cells
    .map(cell => `<td style="${STYLES.cell}">${escapeHtml(cell)}</td>`)
    .join('');
}

function inlineHtml(part: EmailInline): string {
  return typeof part === 'string'
    ? escapeHtml(part)
    : `<a href="${escapeHtml(part.href)}">${escapeHtml(part.label)}</a>`;
}

function blockText(block: EmailBlock): string {
  switch (block.kind) {
    case 'paragraph':
      return block.parts
        .map(part => (typeof part === 'string' ? part : part.label))
        .join('');
    case 'code':
      return block.value;
    case 'table':
      return block.rows.map(row => rowText(row, block.columns)).join('\n');
    case 'groupedTable':
      return block.groups
        .map(({ label, rows }) =>
          [label, ...rows.map(row => rowText(row, block.columns.slice(1)))].join('\n'),
        )
        .join('\n\n');
  }
}

function rowText([label, ...cells]: string[], columns?: string[]): string {
  const values = cells.map((cell, index) =>
    columns ? `${columns[index + 1].toLowerCase()} ${cell}` : cell,
  );
  return `${label}: ${values.join(', ')}`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}
