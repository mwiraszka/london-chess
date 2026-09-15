import { isValidTime } from './is-valid-time.util';

describe('isValidTime', () => {
  it('transforms values correctly', () => {
    expect(isValidTime(undefined)).toBe(false);
    expect(isValidTime(null)).toBe(false);
    expect(isValidTime(true)).toBe(false);
    expect(isValidTime(false)).toBe(false);
    expect(isValidTime({})).toBe(false);
    expect(isValidTime(15)).toBe(false);
    expect(isValidTime(new Date())).toBe(false);

    expect(isValidTime('')).toBe(false);
    expect(isValidTime(' ')).toBe(false);
    expect(isValidTime('1:11a m')).toBe(false);
    expect(isValidTime('1:11am')).toBe(false);
    expect(isValidTime('1 01 am')).toBe(false);
    expect(isValidTime('1:111 am')).toBe(false);
    expect(isValidTime('1:1 am')).toBe(false);
    expect(isValidTime('1:60 am')).toBe(false);
    expect(isValidTime('24:00 am')).toBe(false);
    expect(isValidTime('12:00 mp')).toBe(false);
    expect(isValidTime('12:00 ma')).toBe(false);
    expect(isValidTime('12:00 ap')).toBe(false);
    expect(isValidTime('15:00 pm')).toBe(false);
    expect(isValidTime('15:00')).toBe(false);

    expect(isValidTime('1:11 am')).toBe(true);
    expect(isValidTime('1:01 AM')).toBe(true);
    expect(isValidTime('1:59 pm')).toBe(true);
    expect(isValidTime('12:00 PM')).toBe(true);
  });
});
