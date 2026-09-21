import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Column widths the site needs before it fetches anything

const CONSTANTS_DIR = resolve(__dirname, '../../../frontend/src/app/constants');

// Enough of the longest values that the widest in the site's font is among them
const SIZING_CANDIDATES = 5;

export function longest<T>(
  items: T[],
  text: (item: T) => string,
  count = SIZING_CANDIDATES,
): T[] {
  const distinct = [...new Map(items.map(item => [text(item), item])).values()];
  return distinct.sort((a, b) => text(b).length - text(a).length).slice(0, count);
}

function quote(value: string): string {
  const mark = value.includes("'") && !value.includes('"') ? '"' : "'";
  return `${mark}${value.replace(/\\/g, '\\\\').replace(mark, `\\${mark}`)}${mark}`;
}

function render(value: unknown, indent = ''): string {
  const inner = `${indent}  `;
  if (Array.isArray(value)) {
    return `[\n${value.map(item => `${inner}${render(item, inner)},`).join('\n')}\n${indent}]`;
  }
  if (typeof value === 'object' && value !== null) {
    const fields = Object.entries(value).map(
      ([key, field]) => `${inner}${key}: ${render(field, inner)},`,
    );
    return `{\n${fields.join('\n')}\n${indent}}`;
  }
  return typeof value === 'string' ? quote(value) : String(value);
}

interface SizingConstant {
  file: string;
  name: string;
  type: string;
  value: unknown;
}

export function writeSizing({ file, name, type, value }: SizingConstant): string {
  const path = resolve(CONSTANTS_DIR, file);
  writeFileSync(
    path,
    [
      `import { ${type} } from '@app/models';`,
      '',
      `export const ${name}: ${type} = ${render(value)};`,
      '',
    ].join('\n'),
  );
  return path;
}
