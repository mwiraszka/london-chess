import { isEmpty } from 'lodash';

import { LccError } from '@app/models';

/**
 * Parse a CSV row respecting quoted fields that may contain commas.
 * Handles RFC 4180 CSV format where fields containing commas are wrapped in double quotes.
 *
 * @example
 * parseCsvRow('John,"London, UK",1200') // Returns: ['John', 'London, UK', '1200']
 */
function parseCsvRow(row: string): string[] {
  const result: string[] = [];
  let currentField = '';
  let insideQuotes = false;

  for (let i = 0; i < row.length; i++) {
    const char = row[i];
    const nextChar = row[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        // Handle escaped quotes ("")
        currentField += '"';
        i++; // Skip the next quote
      } else {
        // Toggle quote state
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      // End of field
      result.push(currentField.trim());
      currentField = '';
    } else {
      currentField += char;
    }
  }

  // Push the last field
  result.push(currentField.trim());

  return result;
}

/**
 * Parse a ratings CSV File object and return only the non-empty rows after the header line,
 * projecting for the provided required header columns.
 * Supports quoted fields containing commas (RFC 4180 format).
 *
 * @example
 * const file = new File(['junk,junk\nheader1,header2\nvalue1,value2\n'], 'test.csv', { type: 'text/csv' });
 * const result = await parseCsv(file, ['header1', 'header2']);
 * // result will be [['value1', 'value2']]
 */
export async function parseCsv(
  file: File,
  headers: string[],
  headerScanLimit = 2,
): Promise<string[][] | LccError> {
  try {
    if (!file?.name?.toLowerCase().endsWith('.csv')) {
      return {
        name: 'LCCError',
        message: 'Invalid file extension',
      };
    }

    const text = await file.text();
    if (!text) {
      return {
        name: 'LCCError',
        message: 'Empty file',
      };
    }

    const data = text.split(/\r?\n/).map(row => parseCsvRow(row));

    if (data[0].length < headers.length) {
      return {
        name: 'LCCError',
        message: 'Insufficient data in CSV',
      };
    }

    let headerColumnIndexes: number[] = [];

    for (let i = 0; i < Math.min(data.length, headerScanLimit); i++) {
      const row = data[i].map(cell => cell.toLowerCase());
      for (const header of headers) {
        const headerColumnIndex = row.indexOf(header.toLowerCase());
        if (headerColumnIndex === -1) {
          headerColumnIndexes = [];
          break;
        }
        headerColumnIndexes.push(headerColumnIndex);
      }

      if (headerColumnIndexes.length === headers.length) {
        // Return only the non-empty rows after the header line, for the required header columns
        return data
          .slice(i + 1)
          .filter(row =>
            headerColumnIndexes.every(columnIndex => !isEmpty(row[columnIndex])),
          )
          .map(row => headerColumnIndexes.map(columnIndex => row[columnIndex]));
      }
    }

    if (headerColumnIndexes.length === 0) {
      return {
        name: 'LCCError',
        message: `All required headers [${headers.join(', ')}] were unable to be found within the scan limit`,
      };
    }

    return [[]];
  } catch (error) {
    return {
      name: 'LCCError',
      message: `Failed to parse ratings CSV file: ${error}`,
    };
  }
}
