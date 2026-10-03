import { TestBed } from '@angular/core/testing';

import { StandingsFileService } from './standings-file.service';

const readXlsxFile = vi.hoisted(() => vi.fn());

vi.mock('read-excel-file/browser', () => ({ default: readXlsxFile }));

const HEADER = ['#', 'Name', 'Rating', 'Rd 1', 'Total'];

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

    const { sections, problems } = await service.importStandings([
      new File(['xlsx'], 'Standings.xlsx'),
    ]);

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

    const { sections, problems } = await service.importStandings([
      csv('Open.csv', content),
    ]);

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

    const { sections } = await service.importStandings([
      csv('Open.csv', content),
      csv('U1500.csv', content),
    ]);

    expect(sections.map(({ name }) => name)).toEqual(['Open', 'U1500']);
  });

  it('should refuse files that are not spreadsheets or cannot be read', async () => {
    readXlsxFile.mockRejectedValue(new Error('Not a zip file'));

    const { sections, problems } = await service.importStandings([
      new File(['text'], 'notes.txt'),
      new File(['broken'], 'Broken.xlsx'),
    ]);

    expect(sections).toEqual([]);
    expect(problems).toEqual([
      'notes.txt is not an .xlsx or .csv file.',
      'Broken.xlsx could not be read as a spreadsheet.',
    ]);
  });
});
