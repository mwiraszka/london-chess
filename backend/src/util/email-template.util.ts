export interface EmailContent {
  subject: string;
  text: string;
  html: string;
}

export interface EmailLink {
  href: string;
  label: string;
}

type EmailInline = string | EmailLink;

interface EmailTable {
  kind: 'table';
  rows: string[][];
  columns?: string[];
}

export type EmailBlock =
  | { kind: 'paragraph'; parts: EmailInline[] }
  | { kind: 'code'; value: string }
  | EmailTable;

const SPACING = '16px';

const STYLES = {
  container: 'font-family: Arial, sans-serif; color: #222;',
  heading: `margin: 0 0 ${SPACING};`,
  code: 'font-size: 24px; font-weight: bold; letter-spacing: 2px; font-family: monospace;',
  table: 'border-collapse: collapse;',
  cell: `padding: 4px ${SPACING} 4px 0;`,
  headerCell: `padding: 4px ${SPACING} 4px 0; font-weight: bold; text-align: left;`,
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

  const title = `<h2 style="${STYLES.heading}">${escapeHtml(heading)}</h2>`;

  return {
    subject,
    text: [heading, ...blocks.map(blockText)].join('\n\n'),
    html: `<div style="${STYLES.container}">${title}${body}</div>`,
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
  }
}

function tableRowsHtml({ rows, columns }: EmailTable): string {
  const header = columns
    ? `<tr>${columns.map(column => `<th scope="col" style="${STYLES.headerCell}">${escapeHtml(column)}</th>`).join('')}</tr>`
    : '';
  const body = rows
    .map(([label, ...cells]) => {
      const labelCell = columns
        ? `<td style="${STYLES.cell}">${escapeHtml(label)}</td>`
        : `<th scope="row" style="${STYLES.headerCell}">${escapeHtml(label)}</th>`;
      const valueCells = cells
        .map(cell => `<td style="${STYLES.cell}">${escapeHtml(cell)}</td>`)
        .join('');
      return `<tr>${labelCell}${valueCells}</tr>`;
    })
    .join('');
  return header + body;
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
      return block.rows
        .map(([label, ...cells]) => {
          const values = cells.map((cell, index) =>
            block.columns ? `${block.columns[index + 1].toLowerCase()} ${cell}` : cell,
          );
          return `${label}: ${values.join(', ')}`;
        })
        .join('\n');
  }
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}
