import { isString } from './is-string.util';

describe('isString', () => {
  it('correctly identifies string-type values', () => {
    expect(isString(undefined)).toBe(false);
    expect(isString(null)).toBe(false);
    expect(isString(true)).toBe(false);
    expect(isString(false)).toBe(false);
    expect(isString({})).toBe(false);
    expect(isString(15)).toBe(false);
    expect(isString(new Date())).toBe(false);

    expect(isString('')).toBe(true);
    expect(isString(' ')).toBe(true);
    expect(isString('abc')).toBe(true);
    expect(isString('123')).toBe(true);
    expect(isString('!?')).toBe(true);
    expect(isString('#d$E*__f')).toBe(true);
  });
});
