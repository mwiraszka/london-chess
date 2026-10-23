import { isUnrated } from './rating.util';

describe('isUnrated', () => {
  it('should be true for an unrated member and for a rating from no rated games', () => {
    expect(isUnrated('unrated')).toBe(true);
    expect(isUnrated('1000/0')).toBe(true);
    expect(isUnrated('1200/0')).toBe(true);
  });

  it('should be false for an established or provisional rating', () => {
    expect(isUnrated('1500')).toBe(false);
    expect(isUnrated('1180/4')).toBe(false);
    expect(isUnrated('')).toBe(false);
  });
});
