import { Injectable } from '@angular/core';

import { StandingsFileRead, StandingsImport } from '@app/models';
import { parseStandings } from '@app/utils';

// Reads the standings files a pairing program exports; the parsers load only when needed
@Injectable({ providedIn: 'root' })
export class StandingsFileService {
  public async importStandings(files: readonly File[]): Promise<StandingsImport> {
    const reads = await Promise.all(files.map(file => this.readFile(file)));
    const problems = reads.flatMap(read => ('problem' in read ? [read.problem] : []));
    if (problems.length) {
      return { sections: [], problems };
    }
    return parseStandings(reads.flatMap(read => ('sheets' in read ? read.sheets : [])));
  }

  private async readFile(file: File): Promise<StandingsFileRead> {
    const extension = file.name.split('.').pop()?.toLowerCase();
    try {
      if (extension === 'xlsx') {
        const { default: readXlsxFile } = await import('read-excel-file/browser');
        const sheets = await readXlsxFile(file);
        return {
          sheets: sheets.map(({ sheet, data }) => ({
            name: sheet,
            rows: data.map(row => row.map(cell => this.toText(cell))),
          })),
        };
      }
      if (extension === 'csv') {
        const { parse } = await import('papaparse');
        const text = (await file.text()).replace(/^\uFEFF/, '');
        const { data } = parse<string[]>(text, { skipEmptyLines: 'greedy' });
        return { sheets: [{ name: file.name.replace(/\.[^.]+$/, ''), rows: data }] };
      }
      return { problem: `${file.name} is not an .xlsx or .csv file.` };
    } catch (error) {
      console.error('[LCC] Unable to read standings file:', error);
      return { problem: `${file.name} could not be read as a spreadsheet.` };
    }
  }

  private toText(cell: unknown): string {
    if (cell === null || cell === undefined) {
      return '';
    }
    return cell instanceof Date ? cell.toISOString().slice(0, 10) : String(cell);
  }
}
