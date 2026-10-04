import { clubToday } from './club-date.util';

describe('clubToday', () => {
  it('should turn the day over at midnight in Toronto rather than UTC', () => {
    expect(clubToday(new Date('2026-10-16T03:59:00.000Z'))).toBe('2026-10-15');
    expect(clubToday(new Date('2026-10-16T04:00:00.000Z'))).toBe('2026-10-16');
    expect(clubToday(new Date('2026-01-16T04:59:00.000Z'))).toBe('2026-01-15');
  });

  it('should default to the current time', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-07-01T12:00:00.000Z'));

    expect(clubToday()).toBe('2026-07-01');

    vi.useRealTimers();
  });
});
