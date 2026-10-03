import { Injectable } from '@angular/core';

import { PgnGame, StandingsFileRead, StandingsImport, Tournament } from '@app/models';
import { mergePgnGames, parseStandings, readPgnGames } from '@app/utils';

const SPREADSHEET_EXTENSIONS = ['xlsx', 'csv'];
const PGN_EXTENSIONS = ['pgn', 'txt'];

const extensionOf = (file: File): string =>
  file.name.split('.').pop()?.toLowerCase() ?? '';

// Reads the standings files SwissSys exports, or a PGN of games to add to the recorded
// results; the spreadsheet parsers load only when needed
@Injectable({ providedIn: 'root' })
export class StandingsFileService {
  public async importStandings(
    files: readonly File[],
    tournament: Tournament | null,
  ): Promise<StandingsImport> {
    const pgnFiles = files.filter(file => PGN_EXTENSIONS.includes(extensionOf(file)));
    if (pgnFiles.length && pgnFiles.length < files.length) {
      return this.failed([
        'Choose either the standings SwissSys exports or PGN files of games, not both at once.',
      ]);
    }
    return pgnFiles.length
      ? this.importGames(pgnFiles, tournament)
      : this.importSpreadsheets(files);
  }

  private async importGames(
    files: File[],
    tournament: Tournament | null,
  ): Promise<StandingsImport> {
    if (!tournament) {
      return this.failed([
        'Games from a PGN can only be added once the tournament and its sections are saved.',
      ]);
    }

    const games: PgnGame[] = [];
    const problems: string[] = [];
    for (const file of files) {
      try {
        const read = readPgnGames(await file.text(), file.name);
        games.push(...read.games);
        problems.push(...read.problems);
      } catch (error) {
        console.error('[LCC] Unable to read standings file:', error);
        problems.push(`${file.name} could not be read as a PGN file.`);
      }
    }
    return problems.length ? this.failed(problems) : mergePgnGames(tournament, games);
  }

  private async importSpreadsheets(files: readonly File[]): Promise<StandingsImport> {
    const reads = await Promise.all(files.map(file => this.readFile(file)));
    const problems = reads.flatMap(read => ('problem' in read ? [read.problem] : []));
    if (problems.length) {
      return this.failed(problems);
    }
    return parseStandings(reads.flatMap(read => ('sheets' in read ? read.sheets : [])));
  }

  private failed(problems: string[]): StandingsImport {
    return { sections: [], games: [], knownGameCount: 0, problems };
  }

  private async readFile(file: File): Promise<StandingsFileRead> {
    const extension = extensionOf(file);
    if (!SPREADSHEET_EXTENSIONS.includes(extension)) {
      return {
        problem: `${file.name} is not an .xlsx, .csv, .pgn or .txt file.`,
      };
    }
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
      const { parse } = await import('papaparse');
      const text = (await file.text()).replace(/^\uFEFF/, '');
      const { data } = parse<string[]>(text, { skipEmptyLines: 'greedy' });
      return { sheets: [{ name: file.name.replace(/\.[^.]+$/, ''), rows: data }] };
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
