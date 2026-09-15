import { isDefined } from './is-defined.util';

describe('isDefined', () => {
  it('transforms values correctly', () => {
    expect(isDefined(undefined)).toBe(false);
    expect(isDefined(null)).toBe(false);

    expect(isDefined(true)).toBe(true);
    expect(isDefined(false)).toBe(true);
    expect(isDefined({})).toBe(true);
    expect(isDefined(15)).toBe(true);
    expect(isDefined(new Date())).toBe(true);
    expect(isDefined('')).toBe(true);
    expect(isDefined(' ')).toBe(true);
    expect(isDefined('abc')).toBe(true);
    expect(isDefined('123')).toBe(true);
    expect(isDefined('!?')).toBe(true);
    expect(isDefined('#d$E*__f')).toBe(true);
  });
});
