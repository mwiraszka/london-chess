import { TestBed } from '@angular/core/testing';

import { MOCK_TOURNAMENTS } from '@app/mocks/tournaments.mock';
import { Tournament } from '@app/models';

import { StandingsFileService } from './standings-file.service';

const readXlsxFile = vi.hoisted(() => vi.fn());

vi.mock('read-excel-file/browser', () => ({ default: readXlsxFile }));

const HEADER = ['#', 'Name', 'Rating', 'Rd 1', 'Total'];

// One section of two players with no rounds recorded yet
const TOURNAMENT: Tournament = {
  ...MOCK_TOURNAMENTS[0],
  sections: [
    {
      ...MOCK_TOURNAMENTS[0].sections[0],
      roundCount: 1,
      entries: MOCK_TOURNAMENTS[0].sections[0].entries
        .slice(0, 2)
        .map(entry => ({ ...entry, rounds: [] })),
      games: [],
    },
  ],
};

const PGN = [
  '[Event "Fall Active"]',
  '[Round "1"]',
  '[White "Doe, John"]',
  '[Black "Smith, Jane"]',
  '[Result "1-0"]',
  '',
  '1. e4 e5 1-0',
].join('\n');

describe('StandingsFileService', () => {
  let service: StandingsFileService;

  const csv = (name: string, content: string): File =>
    new File([content], name, { type: 'text/csv' });

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(StandingsFileService);
  });

  it('should read every sheet of a workbook as a section, cells as text', async () => {
    readXlsxFile.mockResolvedValue([
      {
        sheet: 'A',
        data: [
          HEADER,
          [1, 'Doe, Jane', 1500, 'W2 (w)', 1],
          [2, 'Roe, Rick', null, 'L1 (b)', 0],
        ],
      },
      {
        sheet: 'B',
        data: [HEADER, ['1', 'Poe, Pat', '1200', 'B---', '1']],
      },
    ]);

    const { sections, problems } = await service.importStandings(
      [new File(['xlsx'], 'Standings.xlsx')],
      null,
    );

    expect(problems).toEqual([]);
    expect(sections.map(({ name }) => name)).toEqual(['A', 'B']);
    expect(sections[0].entries[1]).toEqual(
      expect.objectContaining({ name: 'Roe, Rick', rating: null, score: 0 }),
    );
  });

  it('should read a CSV file, quoted names and all, as one section', async () => {
    const content = [
      '﻿#,Name,Rating,Rd 1,Total',
      '1,"Doe, Jane",1500,W2 (w),1.0',
      '2,"Roe, Rick",unr.,L1 (b),0.0',
      '',
    ].join('\r\n');

    const { sections, problems } = await service.importStandings(
      [csv('Open.csv', content)],
      null,
    );

    expect(problems).toEqual([]);
    expect(sections).toHaveLength(1);
    expect(sections[0].name).toBe('');
    expect(sections[0].entries.map(({ name }) => name)).toEqual([
      'Doe, Jane',
      'Roe, Rick',
    ]);
  });

  it('should name each of several CSV files after the file', async () => {
    const content = '#,Name,Total\n1,"Doe, Jane",0\n';

    const { sections } = await service.importStandings(
      [csv('Open.csv', content), csv('U1500.csv', content)],
      null,
    );

    expect(sections.map(({ name }) => name)).toEqual(['Open', 'U1500']);
  });

  it('should refuse files that are not spreadsheets or cannot be read', async () => {
    readXlsxFile.mockRejectedValue(new Error('Not a zip file'));

    const { sections, problems } = await service.importStandings(
      [new File(['text'], 'notes.doc'), new File(['broken'], 'Broken.xlsx')],
      null,
    );

    expect(sections).toEqual([]);
    expect(problems).toEqual([
      'notes.doc is not an .xlsx, .csv, .pgn or .txt file.',
      'Broken.xlsx could not be read as a spreadsheet.',
    ]);
  });

  it('should add the games of a PGN file, even one named .txt, to the tournament', async () => {
    const { sections, games, problems } = await service.importStandings(
      [new File([PGN], 'Round 1.txt')],
      TOURNAMENT,
    );

    expect(problems).toEqual([]);
    expect(games).toEqual([
      expect.objectContaining({ round: '1', result: '1-0', plyCount: 2 }),
    ]);
    expect(sections[0].entries[0].rounds).toEqual([
      expect.objectContaining({ round: 1, scores: [1], opponentRank: 2, color: 'white' }),
    ]);
  });

  it('should add nothing while any PGN file has a problem', async () => {
    const { sections, games, problems } = await service.importStandings(
      [new File([PGN], 'Round 1.pgn'), new File([''], 'Notes.txt')],
      TOURNAMENT,
    );

    expect(problems).toEqual(['Notes.txt holds no games.']);
    expect(sections).toEqual([]);
    expect(games).toEqual([]);
  });

  it('should refuse PGN files mixed with spreadsheets', async () => {
    const result = await service.importStandings(
      [new File([PGN], 'Round 1.pgn'), csv('Open.csv', '#,Name\n')],
      TOURNAMENT,
    );

    expect(result).toEqual({
      sections: [],
      games: [],
      problems: [
        'Choose either the standings SwissSys exports or PGN files of games, not both at once.',
      ],
    });
  });

  it('should refuse PGN files before the tournament is saved', async () => {
    const { problems } = await service.importStandings(
      [new File([PGN], 'Round 1.pgn')],
      null,
    );

    expect(problems).toEqual([
      'Games from a PGN can only be added once the tournament and its sections are saved.',
    ]);
  });

  it('should name a PGN file that cannot be read', async () => {
    const unreadable = Object.assign(new File([''], 'Round 1.pgn'), {
      text: () => Promise.reject(new Error('Permission denied')),
    });

    const { problems } = await service.importStandings([unreadable], TOURNAMENT);

    expect(problems).toEqual(['Round 1.pgn could not be read as a PGN file.']);
  });
});
