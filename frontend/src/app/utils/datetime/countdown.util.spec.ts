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

  it('should count down to the second, each unit below the days in two digits', () => {
    expect(shown(2 * DAY + 4 * HOUR + 5 * MINUTE + 9 * SECOND)).toBe('2d 04h 05m 09s');
  });

  it('should leave out the days once none are left', () => {
    expect(shown(3 * HOUR + 12 * MINUTE)).toBe('03h 12m 00s');
  });

  it('should round up to the next second, reaching zero only on the instant', () => {
    expect(shown(MINUTE + 1)).toBe('00h 01m 01s');
    expect(shown(0)).toBe('00h 00m 00s');
    expect(shown(-5 * SECOND)).toBe('00h 00m 00s');
  });

  it('should spell the count out in full', () => {
    expect(describeCountdown(countdownParts(DAY + MINUTE + SECOND))).toBe(
      '1 day, 0 hours, 1 minute, 1 second',
    );
  });
});
