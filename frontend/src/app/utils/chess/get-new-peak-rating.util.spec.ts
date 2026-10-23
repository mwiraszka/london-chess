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

  it('takes any rating over an unrated peak, and keeps the peak while unrated', () => {
    expect(getNewPeakRating('1150/3', 'unrated')).toBe('1150/3');
    expect(getNewPeakRating('900/3', '1000/0')).toBe('900/3');
    expect(getNewPeakRating('unrated', '1500')).toBe('1500');
  });
});
