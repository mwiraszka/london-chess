import { CLUB_TIME_ZONE } from '@app/constants/clubs';
import { Event } from '@app/models';
import moment from '@app/utils/datetime/moment';

// An event counts as upcoming until three hours after it starts, club time
export function isUpcomingEvent(event: Pick<Event, 'eventDate'>): boolean {
  return moment(event.eventDate).add(3, 'hours').isAfter(moment.tz(CLUB_TIME_ZONE));
}
