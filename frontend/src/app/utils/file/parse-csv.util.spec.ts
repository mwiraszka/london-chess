import { isLccError } from '../error/is-lcc-error.util';
import { parseCsv } from './parse-csv.util';

const HEADERS = ['First Name', 'Last Name', 'Old', 'Perf', 'New', 'Peak'];

function mockFile(content: string, name: string): File {
  return { name, text: () => Promise.resolve(content) } as unknown as File;
}

describe('parseCsv', () => {
  it('returns error for non-csv file', async () => {
    const file = mockFile('x', 'test.txt');
    const result = await parseCsv(file, HEADERS);

    expect(result).toEqual({
      name: 'LCCError',
      message: 'Invalid file extension',
    });
  });

  it('returns error for empty file', async () => {
    const file = mockFile('', 'ratings.csv');
    const result = await parseCsv(file, HEADERS);

    expect(result).toEqual({
      name: 'LCCError',
      message: 'Empty file',
    });
  });

  it('returns error when first row has fewer columns than headers', async () => {
    const content = 'first name,last name,old,new,perf\n1,2,3,4,5';
    const file = mockFile(content, 'ratings.csv');
    const result = await parseCsv(file, HEADERS);

    expect(result).toEqual({
      name: 'LCCError',
      message: 'Insufficient data in CSV',
    });
  });

  it('returns error when headers not found within scan limit', async () => {
    // Expected headers placed after the scan limit of 2 lines
    const content = `
      Meta,Row,One,,,,\n
      Meta,Row,Two,,,,\n
      FIRST NAME,LAST NAME,OLD,PERF,NEW,PEAK\n
      John,Doe,1200,1300,1210,1300
    `;
    const file = mockFile(content.trim(), 'ratings.csv');
    const result = await parseCsv(file, HEADERS, 2);

    expect(result).toEqual({
      name: 'LCCError',
      message: `All required headers [${HEADERS.join(', ')}] were unable to be found within the scan limit`,
    });
  });

  it('finds header row within scan limit and projects only requested columns', async () => {
    // Add an extra column we don't request (RESULTS) to ensure projection works
    const content = `
      Meta,Row,One,,,,\n
      FIRST NAME,LAST NAME,OLD,PERF,NEW,PEAK,RESULTS\n
      John,Doe,1200,1300,1210,1300,5.0
    `;
    const file = mockFile(content.trim(), 'ratings.csv');
    const result = await parseCsv(file, HEADERS, 3);

    if (isLccError(result)) {
      fail('Expected successful parse');
    }

    // Should return only rows after header, with only columns matching HEADERS (6 columns)
    expect(result.length).toBe(1);
    expect(result[0].length).toBe(HEADERS.length);
    expect(result[0]).toEqual(['John', 'Doe', '1200', '1300', '1210', '1300']);
  });

  it('filters out rows missing any required column value', async () => {
    const content = `
      FIRST NAME,LAST NAME,OLD,PERF,NEW,PEAK\n
      John,Doe,1200,1300,1210,1300\n
      Jane,,1250,1290,1260,1295\n
      Smith,1100,1150,1110,1150\n
      ,,,,,\n
      Magnus,Carlsen,2830,3000,2850,2882\n
    `;
    const file = mockFile(content.trim(), 'ratings.csv');
    const result = await parseCsv(file, HEADERS);

    if (isLccError(result)) {
      fail('Expected successful parse');
    }

    expect(result.length).toBe(2);
    expect(result[0]).toEqual(['John', 'Doe', '1200', '1300', '1210', '1300']);
    expect(result[1]).toEqual(['Magnus', 'Carlsen', '2830', '3000', '2850', '2882']);
  });

  it('handles quoted fields containing commas', async () => {
    const content = `
      FIRST NAME,LAST NAME,OLD,PERF,NEW,PEAK\n
      John,"Doe, Jr.",1200,1300,1210,1300\n
      Jane,"Smith-Jones, PhD",1250,1290,1260,1295\n
    `;
    const file = mockFile(content.trim(), 'ratings.csv');
    const result = await parseCsv(file, HEADERS);

    if (isLccError(result)) {
      fail('Expected successful parse');
    }

    expect(result.length).toBe(2);
    expect(result[0]).toEqual(['John', 'Doe, Jr.', '1200', '1300', '1210', '1300']);
    expect(result[1]).toEqual([
      'Jane',
      'Smith-Jones, PhD',
      '1250',
      '1290',
      '1260',
      '1295',
    ]);
  });

  it('handles escaped quotes within quoted fields', async () => {
    const content = `
      FIRST NAME,LAST NAME,OLD,PERF,NEW,PEAK\n
      John,"O""Brien",1200,1300,1210,1300\n
    `;
    const file = mockFile(content.trim(), 'ratings.csv');
    const result = await parseCsv(file, HEADERS);

    if (isLccError(result)) {
      fail('Expected successful parse');
    }

    expect(result.length).toBe(1);
    expect(result[0]).toEqual(['John', 'O"Brien', '1200', '1300', '1210', '1300']);
  });

  it('handles mixed quoted and unquoted fields', async () => {
    const content = `
      FIRST NAME,LAST NAME,OLD,PERF,NEW,PEAK\n
      John,Doe,1200,1300,1210,1300\n
      Jane,"Smith, MD",1250,1290,1260,1295\n
      Magnus,Carlsen,2830,3000,2850,2882\n
    `;
    const file = mockFile(content.trim(), 'ratings.csv');
    const result = await parseCsv(file, HEADERS);

    if (isLccError(result)) {
      fail('Expected successful parse');
    }

    expect(result.length).toBe(3);
    expect(result[0]).toEqual(['John', 'Doe', '1200', '1300', '1210', '1300']);
    expect(result[1]).toEqual(['Jane', 'Smith, MD', '1250', '1290', '1260', '1295']);
    expect(result[2]).toEqual(['Magnus', 'Carlsen', '2830', '3000', '2850', '2882']);
  });
});
