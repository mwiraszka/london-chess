import { isBrand } from './is-brand.util';

describe('isBrand', () => {
  it('should accept the brands a member can choose', () => {
    expect(isBrand('modern')).toBe(true);
    expect(isBrand('classic')).toBe(true);
    expect(isBrand('sunset')).toBe(true);
    expect(isBrand('newsprint')).toBe(true);
    expect(isBrand('playground')).toBe(true);
  });

  it('should reject anything else', () => {
    expect(isBrand('neon')).toBe(false);
    expect(isBrand('toString')).toBe(false);
    expect(isBrand(null)).toBe(false);
  });
});
