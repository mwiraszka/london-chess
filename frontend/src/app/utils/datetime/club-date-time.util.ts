import { CLUB_TIME_ZONE } from '@app/constants/clubs';
import { ClubDateTime, IsoDate } from '@app/models';
import moment from '@app/utils/datetime/moment';

const DAY_FORMAT = 'YYYY-MM-DD';

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

const pad = (value: number): string => String(value).padStart(2, '0');

// Date pickers hold local midnight, so the day is read from the browser's own calendar
export function toDayString(day: Date): string {
  return `${day.getFullYear()}-${pad(day.getMonth() + 1)}-${pad(day.getDate())}`;
}

export function fromDayString(value: string): Date | null {
  const day = moment(value, DAY_FORMAT, true);
  return day.isValid() ? new Date(day.year(), day.month(), day.date()) : null;
}

// The club's calendar day and clock time for an instant, wherever the browser is
export function toClubDateTime(instant: IsoDate): ClubDateTime {
  const clubTime = moment.tz(instant, CLUB_TIME_ZONE);
  return {
    day: new Date(clubTime.year(), clubTime.month(), clubTime.date()),
    time: clubTime.format('HH:mm'),
  };
}

// The instant a day and time name on the club's clock, or null until both are set
export function fromClubDateTime(day: Date | null, time: string | null): IsoDate | null {
  if (!day || !time || !TIME.test(time)) {
    return null;
  }
  return moment
    .tz(`${toDayString(day)} ${time}`, `${DAY_FORMAT} HH:mm`, CLUB_TIME_ZONE)
    .toISOString();
}
