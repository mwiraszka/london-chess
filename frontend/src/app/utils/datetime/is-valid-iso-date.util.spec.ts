import { isValidIsoDate } from './is-valid-iso-date.util';

describe('isValidIsoDate', () => {
  it('returns true for valid ISO dates', () => {
    expect(isValidIsoDate('2025')).toBe(true);
    expect(isValidIsoDate('2025-01')).toBe(true);
    expect(isValidIsoDate('2025-01-01')).toBe(true);
    expect(isValidIsoDate('2025-01-01T18:00:00')).toBe(true);
    expect(isValidIsoDate('2025-01-01T18:00:00Z')).toBe(true);
  });

  it('returns false for invalid ISO dates', () => {
    expect(isValidIsoDate(undefined)).toBe(false);
    expect(isValidIsoDate(null)).toBe(false);
    expect(isValidIsoDate(true)).toBe(false);
    expect(isValidIsoDate(false)).toBe(false);
    expect(isValidIsoDate({})).toBe(false);
    expect(isValidIsoDate(15)).toBe(false);
    expect(isValidIsoDate(new Date())).toBe(false);

    expect(isValidIsoDate('')).toBe(false);
    expect(isValidIsoDate(' ')).toBe(false);
    expect(isValidIsoDate('January 1, 2025')).toBe(false);
    expect(isValidIsoDate('2025-01-')).toBe(false);
    expect(isValidIsoDate('2025-01-01T18:00:0')).toBe(false);
    expect(isValidIsoDate('2025-01-01T24:00:000Z')).toBe(false);
  });
});
