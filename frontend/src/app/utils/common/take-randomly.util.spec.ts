import { takeRandomly } from './take-randomly.util';

describe('takeRandomly', () => {
  beforeEach(() => {
    vi.spyOn(Math, 'random').mockReturnValue(0.8);
  });

  it('from empty array', () => {
    expect(takeRandomly([])).toStrictEqual([]);
    expect(takeRandomly([], 0)).toStrictEqual([]);
    expect(takeRandomly([], 2)).toStrictEqual([]);
  });

  it('from an array of numbers', () => {
    expect(takeRandomly([1, 3, 5])).toStrictEqual([5, 3, 1]);
    expect(takeRandomly([1, 3, 5], 0)).toStrictEqual([]);
    expect(takeRandomly([1, 3, 5], 2)).toStrictEqual([5, 3]);
  });

  it('from an array of objects', () => {
    const a = { x: 15 };
    const b = { y: { y: 'test' } };
    const c = { z: null };
    expect(takeRandomly([a, b, c])).toStrictEqual([c, b, a]);
    expect(takeRandomly([a, b, c], 0)).toStrictEqual([]);
    expect(takeRandomly([a, b, c], 2)).toStrictEqual([c, b]);
  });
});
