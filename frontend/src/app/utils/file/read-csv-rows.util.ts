import { parse } from 'papaparse';

export function readCsvRows(text: string): string[][] {
  return parse<string[]>(text, { skipEmptyLines: 'greedy' }).data;
}
