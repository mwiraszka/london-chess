const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const count = (amount: number, unit: string): string =>
  `${amount} ${unit}${amount === 1 ? '' : 's'}`;

// The two largest units left, never less than a minute: "2 days, 4 hours" or "12 minutes"
export function countdownLabel(milliseconds: number): string {
  const minutes = Math.max(1, Math.ceil(milliseconds / MINUTE));
  if (minutes * MINUTE >= DAY) {
    const days = Math.floor((minutes * MINUTE) / DAY);
    const hours = Math.floor(((minutes * MINUTE) % DAY) / HOUR);
    return hours ? `${count(days, 'day')}, ${count(hours, 'hour')}` : count(days, 'day');
  }
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    return rest
      ? `${count(hours, 'hour')}, ${count(rest, 'minute')}`
      : count(hours, 'hour');
  }
  return count(minutes, 'minute');
}
