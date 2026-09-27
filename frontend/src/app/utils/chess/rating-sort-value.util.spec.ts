import { ratingSortValue } from './rating-sort-value.util';

describe('ratingSortValue', () => {
  it('orders ratings by number rather than by their text', () => {
    expect(ratingSortValue('985')).toBeLessThan(ratingSortValue('1000'));
  });

  it('ranks a provisional rating just below an established one of the same value', () => {
    expect(ratingSortValue('1800/12')).toBeLessThan(ratingSortValue('1800'));
    expect(ratingSortValue('1800/12')).toBeGreaterThan(ratingSortValue('1799'));
  });

  it('ranks provisional ratings of the same value by their game count', () => {
    expect(ratingSortValue('1800/5')).toBeLessThan(ratingSortValue('1800/12'));
  });
});
