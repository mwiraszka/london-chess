import { calendarMonthKeys, dayKeyOf, monthKeyOf } from './calendar-months.util';

describe('calendarMonthKeys', () => {
  const at = (eventDate: string) => ({ eventDate });

  it('should run from the current month through the last event, gaps included', () => {
    const months = calendarMonthKeys(
      [at('2026-12-10T23:00:00.000Z'), at('2026-11-05T23:00:00.000Z')],
      '2026-10-07',
    );

    expect(months).toEqual(['2026-10', '2026-11', '2026-12']);
  });

  it('should reach back to the first event when it is earlier than today', () => {
    const months = calendarMonthKeys(
      [at('2026-08-13T22:00:00.000Z'), at('2026-10-29T22:00:00.000Z')],
      '2026-10-07',
    );

    expect(months).toEqual(['2026-08', '2026-09', '2026-10']);
  });

  it('should cross into the next year', () => {
    const months = calendarMonthKeys([at('2027-01-14T23:00:00.000Z')], '2026-12-01');

    expect(months).toEqual(['2026-12', '2027-01']);
  });

  it('should have no months without events', () => {
    expect(calendarMonthKeys([], '2026-10-07')).toEqual([]);
  });
});

describe('monthKeyOf and dayKeyOf', () => {
  it('should key a date by its local month and day', () => {
    const date = new Date(2026, 9, 7, 19, 0).toISOString();

    expect(monthKeyOf(date)).toBe('2026-10');
    expect(dayKeyOf(date)).toBe('2026-10-07');
  });
});
