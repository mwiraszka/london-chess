import { MonthStyle } from '@app/models';
import moment from '@app/utils/datetime/moment';

// A date recorded as YYYY, YYYY-MM or YYYY-MM-DD, shown as far as it is known
export function formatPartialDate(date: string, months: MonthStyle = 'long'): string {
  const month = months === 'short' ? 'MMM' : 'MMMM';
  const parts = date.split('-').length;
  const format =
    parts === 1 ? 'YYYY' : parts === 2 ? `${month} YYYY` : `${month} D, YYYY`;
  return moment(date, 'YYYY-MM-DD').format(format);
}
