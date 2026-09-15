import { getNewPeakRating } from './get-new-peak-rating.util';

describe('getNewPeakRating', () => {
  it('returns 0 if either rating is a non-numeric value', () => {
    expect(getNewPeakRating('1000/5', 'd/5')).toBe('0');
    expect(getNewPeakRating('1000/a', '1000')).toBe('0');
    expect(getNewPeakRating('abc', 'abc')).toBe('0');
  });

  it('returns correct new peak rating', () => {
    expect(getNewPeakRating('1000', '1000')).toBe('1000');
    expect(getNewPeakRating('1000', '800')).toBe('1000');
    expect(getNewPeakRating('1000', '1200/5')).toBe('1000');
    expect(getNewPeakRating('1000/5', '1200/5')).toBe('1200/5');
    expect(getNewPeakRating('1000/5', '800/5')).toBe('1000/5');
  });
});
