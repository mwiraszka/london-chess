import moment from 'moment-timezone';

import { formatPartialDate } from './format-partial-date.util';

// The days a tournament ran, from YYYY-MM-DD dates: one day as it is, and a span
// with an en dash, closed up within a month and spaced once the months differ
export function formatDateRange(start: string, end: string | null): string {
  if (!end || end === start) {
    return formatPartialDate(start);
  }

  const from = moment(start, 'YYYY-MM-DD');
  const to = moment(end, 'YYYY-MM-DD');
  if (from.isSame(to, 'month')) {
    return `${from.format('MMMM D')}–${to.format('D, YYYY')}`;
  }
  if (from.isSame(to, 'year')) {
    return `${from.format('MMMM D')} – ${to.format('MMMM D, YYYY')}`;
  }
  return `${from.format('MMMM D, YYYY')} – ${to.format('MMMM D, YYYY')}`;
}
