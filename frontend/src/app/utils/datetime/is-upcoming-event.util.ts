import moment from 'moment-timezone';

import { Event } from '@app/models';

// An event counts as upcoming until three hours after it starts, club time
export function isUpcomingEvent(event: Pick<Event, 'eventDate'>): boolean {
  return moment(event.eventDate).add(3, 'hours').isAfter(moment.tz('America/Toronto'));
}
