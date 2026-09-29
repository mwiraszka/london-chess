import {
  fromClubDateTime,
  fromDayString,
  toClubDateTime,
  toDayString,
} from './club-date-time.util';

describe('club date and time', () => {
  describe('toClubDateTime', () => {
    it('should read the day and time on the club clock', () => {
      const { day, time } = toClubDateTime('2026-10-16T01:30:00.000Z');

      expect(toDayString(day)).toBe('2026-10-15');
      expect(time).toBe('21:30');
    });

    it('should follow the clock across the change to standard time', () => {
      expect(toClubDateTime('2026-11-10T23:00:00.000Z').time).toBe('18:00');
      expect(toClubDateTime('2026-10-10T22:00:00.000Z').time).toBe('18:00');
    });
  });

  describe('fromClubDateTime', () => {
    it('should give the instant of a day and time on the club clock', () => {
      expect(fromClubDateTime(new Date(2026, 9, 15), '21:30')).toBe(
        '2026-10-16T01:30:00.000Z',
      );
      expect(fromClubDateTime(new Date(2026, 10, 10), '18:00')).toBe(
        '2026-11-10T23:00:00.000Z',
      );
    });

    it('should round-trip what it reads', () => {
      const instant = '2026-05-01T22:10:00.000Z';
      const { day, time } = toClubDateTime(instant);

      expect(fromClubDateTime(day, time)).toBe(instant);
    });

    it('should have no instant until a valid day and time are both set', () => {
      expect(fromClubDateTime(null, '18:00')).toBeNull();
      expect(fromClubDateTime(new Date(2026, 9, 15), null)).toBeNull();
      expect(fromClubDateTime(new Date(2026, 9, 15), '6:00 PM')).toBeNull();
      expect(fromClubDateTime(new Date(2026, 9, 15), '24:00')).toBeNull();
    });
  });

  describe('day strings', () => {
    it('should write and read a day without shifting it', () => {
      expect(toDayString(new Date(2026, 0, 5))).toBe('2026-01-05');
      expect(fromDayString('2026-01-05')).toEqual(new Date(2026, 0, 5));
    });

    it('should read no day from anything but a real YYYY-MM-DD day', () => {
      expect(fromDayString('2026-02-30')).toBeNull();
      expect(fromDayString('05/01/2026')).toBeNull();
      expect(fromDayString('')).toBeNull();
    });
  });
});
