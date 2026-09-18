import { formatPartialDate } from './format-partial-date.util';

describe('formatPartialDate', () => {
  it('should show a full date', () => {
    expect(formatPartialDate('2023-12-07')).toBe('December 7, 2023');
  });

  it('should show only the month when the day is unknown', () => {
    expect(formatPartialDate('1996-05')).toBe('May 1996');
  });

  it('should show only the year when nothing more is known', () => {
    expect(formatPartialDate('1996')).toBe('1996');
  });
});
