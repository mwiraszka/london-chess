import { RangePipe } from './range.pipe';

describe('RangePipe', () => {
  const pipe = new RangePipe();

  it('generates ranges correctly when no offset provided', () => {
    expect(pipe.transform(-10)).toStrictEqual([]);
    expect(pipe.transform(-1)).toStrictEqual([]);
    expect(pipe.transform(0)).toStrictEqual([]);
    expect(pipe.transform(1)).toStrictEqual([0]);
    expect(pipe.transform(2)).toStrictEqual([0, 1]);
    expect(pipe.transform(5)).toStrictEqual([0, 1, 2, 3, 4]);
  });

  it('generates ranges correctly when a positive offset is provided', () => {
    expect(pipe.transform(-10, 2)).toStrictEqual([]);
    expect(pipe.transform(-1, 2)).toStrictEqual([]);
    expect(pipe.transform(0, 2)).toStrictEqual([]);
    expect(pipe.transform(1, 2)).toStrictEqual([2]);
    expect(pipe.transform(2, 2)).toStrictEqual([2, 3]);
    expect(pipe.transform(5, 2)).toStrictEqual([2, 3, 4, 5, 6]);
  });

  it('generates ranges correctly when a negative offset is provided', () => {
    expect(pipe.transform(-10, -2)).toStrictEqual([]);
    expect(pipe.transform(-1, -2)).toStrictEqual([]);
    expect(pipe.transform(0, -2)).toStrictEqual([]);
    expect(pipe.transform(1, -2)).toStrictEqual([-2]);
    expect(pipe.transform(2, -2)).toStrictEqual([-2, -1]);
    expect(pipe.transform(5, -2)).toStrictEqual([-2, -1, 0, 1, 2]);
  });
});
