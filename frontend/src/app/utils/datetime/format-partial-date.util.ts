import moment from 'moment-timezone';

// A date recorded as YYYY, YYYY-MM or YYYY-MM-DD, shown as far as it is known
export function formatPartialDate(date: string): string {
  const parts = date.split('-').length;
  const format = parts === 1 ? 'YYYY' : parts === 2 ? 'MMMM YYYY' : 'MMMM D, YYYY';
  return moment(date, 'YYYY-MM-DD').format(format);
}
