import { getInitials } from './get-initials.util';

describe('getInitials', () => {
  it('takes the first and last initials of a full name', () => {
    expect(getInitials('Jo Ann Smith')).toBe('JS');
    expect(getInitials('  ada   lovelace ')).toBe('AL');
  });

  it('takes a single initial from a one-word name', () => {
    expect(getInitials('cher')).toBe('C');
  });

  it('returns `undefined` for a blank name', () => {
    expect(getInitials('')).toBeUndefined();
    expect(getInitials('   ')).toBeUndefined();
  });
});
