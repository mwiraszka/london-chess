import { formatDateRange } from './format-date-range.util';

describe('formatDateRange', () => {
  it('should show a single day as it is', () => {
    expect(formatDateRange('2025-09-04', null)).toBe('September 4, 2025');
    expect(formatDateRange('2025-09-04', '2025-09-04')).toBe('September 4, 2025');
  });

  it('should close up a span within one month', () => {
    expect(formatDateRange('2025-09-04', '2025-09-25')).toBe('September 4–25, 2025');
  });

  it('should space a span across months', () => {
    expect(formatDateRange('2025-09-04', '2025-10-09')).toBe(
      'September 4 – October 9, 2025',
    );
  });

  it('should date both ends of a span across years', () => {
    expect(formatDateRange('2025-12-04', '2026-01-08')).toBe(
      'December 4, 2025 – January 8, 2026',
    );
  });
});
