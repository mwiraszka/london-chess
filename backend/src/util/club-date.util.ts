const CLUB_DAY = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Toronto',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

// The club plays in Ontario, so a tournament's day turns over on Toronto time
export function clubToday(now: Date = new Date()): string {
  return CLUB_DAY.format(now);
}
