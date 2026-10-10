import { Event } from '@app/models';
import { clubToday } from '@app/utils/chess/tournament-status.util';
import moment from '@app/utils/datetime/moment';

export const monthKeyOf = (date: string): string => moment(date).format('YYYY-MM');

export const dayKeyOf = (date: string): string => moment(date).format('YYYY-MM-DD');

// From the earlier of the club's current month and the first event's, so the calendar
// always reaches the present, through the last event's
export function calendarMonthKeys(
  events: Pick<Event, 'eventDate'>[],
  today: string = clubToday(),
): string[] {
  if (!events.length) {
    return [];
  }

  const eventMonths = events.map(({ eventDate }) => monthKeyOf(eventDate)).sort();
  const first = [today.slice(0, 7), eventMonths[0]].sort()[0];
  const last = eventMonths[eventMonths.length - 1];

  const months: string[] = [];
  for (const month = moment(first, 'YYYY-MM'); month.format('YYYY-MM') <= last;) {
    months.push(month.format('YYYY-MM'));
    month.add(1, 'month');
  }
  return months;
}
