import { getPasswordChecks, meetsPasswordRequirements } from './password.util';

describe('password util', () => {
  it('reports each requirement separately', () => {
    expect(getPasswordChecks('')).toEqual({
      length: false,
      cases: false,
      number: false,
      special: false,
    });
    expect(getPasswordChecks('abcdefgh')).toEqual({
      length: true,
      cases: false,
      number: false,
      special: false,
    });
    expect(getPasswordChecks('aB1!')).toEqual({
      length: false,
      cases: true,
      number: true,
      special: true,
    });
  });

  it('only accepts passwords meeting every requirement', () => {
    expect(meetsPasswordRequirements('abcdefgh')).toBe(false);
    expect(meetsPasswordRequirements('Abcdefg1')).toBe(false);
    expect(meetsPasswordRequirements('Abcdef1!')).toBe(true);
  });
});
