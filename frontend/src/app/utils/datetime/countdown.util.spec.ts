import { countdownLabel } from './countdown.util';

describe('countdownLabel', () => {
  const MINUTE = 60_000;
  const HOUR = 60 * MINUTE;
  const DAY = 24 * HOUR;

  it('should count days and hours while more than a day is left', () => {
    expect(countdownLabel(2 * DAY + 4 * HOUR + 30 * MINUTE)).toBe('2 days, 4 hours');
    expect(countdownLabel(DAY)).toBe('1 day');
  });

  it('should count hours and minutes within a day', () => {
    expect(countdownLabel(3 * HOUR + 12 * MINUTE)).toBe('3 hours, 12 minutes');
    expect(countdownLabel(HOUR)).toBe('1 hour');
  });

  it('should count minutes within an hour, rounding up and never below one', () => {
    expect(countdownLabel(11 * MINUTE + 5_000)).toBe('12 minutes');
    expect(countdownLabel(1_000)).toBe('1 minute');
    expect(countdownLabel(-5_000)).toBe('1 minute');
  });
});
