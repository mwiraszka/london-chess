import moment from 'moment-timezone';

import { DateFormat, IsoDate } from '@app/models';

/**
 * Convert ISO8601 date string (`YYYY-MM-DDTHH:mm:ss`) to one of the following formats:
 * * `long`: Thursday, January 1st 2024 at 6:00 PM (default)
 * * `long no-time`: Thursday, January 1st 2024
 * * `long day-of-week`: Thursday
 * * `long month-day-year`: January 1st, 2024
 * * `short`: Thu, Jan 1, 2024, 6:00 PM
 * * `short no-time`: Thu, Jan 1, 2024
 * * `short day-of-week`: Thu
 * * `short month-day`: Jan 1
 * * `short month-day-year`: Jan 1, 2024
 * * `year`: 2024
 * * `time`: 6:00 PM

 * Timezone automatically displayed as EST/EDT due to default timezone set in root App Component.
 *
 * Return `'Invalid date'` if date provided is undefined or has invalid ISO860 format.
 */
export function formatDate(date?: IsoDate, format: DateFormat = 'long'): string {
  switch (format) {
    case 'long':
      return moment(date).format('dddd, MMMM Do YYYY [at] h:mm A');
    case 'long no-time':
      return moment(date).format('dddd, MMMM Do YYYY');
    case 'long month-day-year':
      return moment(date).format('MMMM Do, YYYY');
    case 'long day-of-week':
      return moment(date).format('dddd');
    case 'short':
      return moment(date).format('ddd, MMM D, YYYY, h:mm A');
    case 'short no-time':
      return moment(date).format('ddd, MMM D, YYYY');
    case 'short day-of-week':
      return moment(date).format('ddd');
    case 'short month-day':
      return moment(date).format('MMM D');
    case 'short month-day-year':
      return moment(date).format('MMM D, YYYY');
    case 'year':
      return moment(date).format('YYYY');
    case 'time':
      return moment(date).format('h:mm A');
  }
}
