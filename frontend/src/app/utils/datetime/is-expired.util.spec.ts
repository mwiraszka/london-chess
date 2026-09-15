import moment from 'moment-timezone';

import { isExpired } from './is-expired.util';

describe('isExpired', () => {
  it('returns true for invalid dates', () => {
    expect(isExpired('')).toBe(true);
    expect(isExpired('invalid-date')).toBe(true);
    expect(isExpired('2023-13-32')).toBe(true);
    expect(isExpired('2023/01/01')).toBe(true);
    expect(isExpired(undefined)).toBe(true);
    expect(isExpired(null)).toBe(true);
  });

  it('returns true when date is in the past (default 1800 seconds)', () => {
    const pastDate = moment().subtract(1801, 'seconds').toISOString();
    const justPastDate = moment().subtract(31, 'minutes').toISOString();

    expect(isExpired(pastDate)).toBe(true);
    expect(isExpired(justPastDate)).toBe(true);
    expect(isExpired('2020-01-01T00:00:00Z')).toBe(true);
  });

  it('returns false when date is not in the past (default 1800 seconds)', () => {
    const futureDate = moment().add(5, 'minute').toISOString();
    const farFutureDate = moment().add(1, 'year').toISOString();

    expect(isExpired(futureDate)).toBe(false);
    expect(isExpired(farFutureDate)).toBe(false);
  });

  it('correctly checks if date is X seconds in the past', () => {
    const now = moment();

    const seconds59Past = now.clone().subtract(59, 'seconds').toISOString();
    const seconds61Past = now.clone().subtract(61, 'seconds').toISOString();

    expect(isExpired(seconds59Past, 60)).toBe(false);
    expect(isExpired(seconds61Past, 60)).toBe(true);
  });
});
