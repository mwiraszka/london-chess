import { EntityType, LccError } from '@app/models';

import { camelCaseToSentenceCase } from '../common/camel-case-to-sentence-case.util';

/**
 * Export an array of any Entity objects (Article, Image, Event, Member) to a CSV file.
 *
 * @param data - The array of EntityType objects to export
 * @param filename - The name of the file to create
 *
 * @returns The number of rows (excluding header row) if the export was successful,
 * or an LccError object if it failed.
 */
export function exportDataToCsv(data: EntityType[], filename: string): number | LccError {
  try {
    if (data.length === 0) {
      return {
        name: 'LCCError' as const,
        message: 'No data available for export',
      };
    }

    const flattenedData = data.map(entity => {
      const flattenedObject: Record<string, unknown> = {};

      Object.entries(entity).forEach(([key, value]) => {
        if (
          value !== null &&
          typeof value === 'object' &&
          !(value instanceof Date) &&
          !Array.isArray(value)
        ) {
          Object.entries(value).forEach(([innerKey, innerValue]) => {
            flattenedObject[innerKey] = innerValue as string | number | boolean | null;
          });
        } else {
          flattenedObject[key] = value as string | number | boolean | null;
        }
      });

      return flattenedObject;
    });

    const headers = Object.keys(flattenedData[0]);
    const csvHeaders = headers.map(header => camelCaseToSentenceCase(header)).join(',');
    const csvRows = flattenedData.map(entity =>
      headers
        .map(header => {
          const value = entity[header];

          if (value === null || value === undefined) {
            return '';
          }

          if (
            typeof value === 'string' &&
            (value.includes(',') || value.includes('"') || value.includes('\n'))
          ) {
            return `"${value.replace(/"/g, '""')}"`;
          }

          return String(value);
        })
        .join(','),
    );
    const csvContent = [csvHeaders, ...csvRows].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');

    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    return data.length;
  } catch {
    return {
      name: 'LCCError' as const,
      message: 'Unknown error occurred while exporting data to CSV',
    };
  }
}
