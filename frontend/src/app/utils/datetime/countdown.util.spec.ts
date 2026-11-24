import { countdownParts, describeCountdown } from './countdown.util';

describe('countdown', () => {
  const SECOND = 1_000;
  const MINUTE = 60 * SECOND;
  const HOUR = 60 * MINUTE;
  const DAY = 24 * HOUR;

  const shown = (milliseconds: number): string =>
    countdownParts(milliseconds)
      .map(({ digits, unit }) => `${digits}${unit}`)
      .join(' ');

  it('should count down to the second, every unit in at least two digits', () => {
    expect(shown(2 * DAY + 4 * HOUR + 5 * MINUTE + 9 * SECOND)).toBe('02d 04h 05m 09s');
    expect(shown(123 * DAY)).toBe('123d 00h 00m 00s');
  });

  it('should keep every unit, empty ones at zero, however little is left', () => {
    expect(shown(3 * HOUR + 12 * MINUTE)).toBe('00d 03h 12m 00s');
    expect(shown(SECOND)).toBe('00d 00h 00m 01s');
  });

  it('should round up to the next second, reaching zero only on the instant', () => {
    expect(shown(MINUTE + 1)).toBe('00d 00h 01m 01s');
    expect(shown(0)).toBe('00d 00h 00m 00s');
    expect(shown(-5 * SECOND)).toBe('00d 00h 00m 00s');
  });

  it('should spell the count out from its first unit with any left', () => {
    expect(describeCountdown(countdownParts(DAY + MINUTE + SECOND))).toBe(
      '1 day, 0 hours, 1 minute, 1 second',
    );
    expect(describeCountdown(countdownParts(3 * MINUTE))).toBe('3 minutes, 0 seconds');
    expect(describeCountdown(countdownParts(0))).toBe('0 seconds');
  });
});
