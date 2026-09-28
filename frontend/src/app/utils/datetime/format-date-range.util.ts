import moment from 'moment-timezone';

import { MonthStyle } from '@app/models';

import { formatPartialDate } from './format-partial-date.util';

// An en dash closed up within a month and spaced across months
export function formatDateRange(
  start: string,
  end: string | null,
  months: MonthStyle = 'long',
): string {
  if (!end || end === start) {
    return formatPartialDate(start, months);
  }

  const month = months === 'short' ? 'MMM' : 'MMMM';
  const from = moment(start, 'YYYY-MM-DD');
  const to = moment(end, 'YYYY-MM-DD');
  if (from.isSame(to, 'month')) {
    return `${from.format(`${month} D`)}–${to.format('D, YYYY')}`;
  }
  if (from.isSame(to, 'year')) {
    return `${from.format(`${month} D`)} – ${to.format(`${month} D, YYYY`)}`;
  }
  return `${from.format(`${month} D, YYYY`)} – ${to.format(`${month} D, YYYY`)}`;
}
