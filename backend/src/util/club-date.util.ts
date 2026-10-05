export const CLUB_TIME_ZONE = 'America/Toronto';

const CLUB_DAY = new Intl.DateTimeFormat('en-CA', {
  timeZone: CLUB_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

// The club plays in Ontario, so a tournament's day turns over on Toronto time
export function clubToday(now: Date = new Date()): string {
  return CLUB_DAY.format(now);
}
