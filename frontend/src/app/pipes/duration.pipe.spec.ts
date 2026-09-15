import { DurationPipe } from './duration.pipe';

describe('DurationPipe', () => {
  const pipe = new DurationPipe();

  it('transforms non-numeric values correctly', () => {
    expect(pipe.transform(undefined)).toBe('00:00');
    expect(pipe.transform(null)).toBe('00:00');
    expect(pipe.transform(true)).toBe('00:00');
    expect(pipe.transform(false)).toBe('00:00');
    expect(pipe.transform({})).toBe('00:00');
    expect(pipe.transform(new Date())).toBe('00:00');
    expect(pipe.transform('')).toBe('00:00');
    expect(pipe.transform('abc')).toBe('00:00');
  });

  it('transforms negative values to 00:00', () => {
    expect(pipe.transform(-1)).toBe('00:00');
    expect(pipe.transform(-30)).toBe('00:00');
    expect(pipe.transform(-100)).toBe('00:00');
  });

  it('transforms zero correctly', () => {
    expect(pipe.transform(0)).toBe('00:00');
  });

  it('transforms seconds less than 60 correctly', () => {
    expect(pipe.transform(1)).toBe('00:01');
    expect(pipe.transform(9)).toBe('00:09');
    expect(pipe.transform(10)).toBe('00:10');
    expect(pipe.transform(30)).toBe('00:30');
    expect(pipe.transform(59)).toBe('00:59');
  });

  it('transforms values with minutes correctly', () => {
    expect(pipe.transform(60)).toBe('01:00');
    expect(pipe.transform(61)).toBe('01:01');
    expect(pipe.transform(90)).toBe('01:30');
    expect(pipe.transform(119)).toBe('01:59');
    expect(pipe.transform(120)).toBe('02:00');
    expect(pipe.transform(125)).toBe('02:05');
  });

  it('transforms large values correctly', () => {
    expect(pipe.transform(600)).toBe('10:00');
    expect(pipe.transform(599)).toBe('09:59');
    expect(pipe.transform(3599)).toBe('59:59');
    expect(pipe.transform(3600)).toBe('60:00');
    expect(pipe.transform(3661)).toBe('61:01');
  });

  it('handles decimal values by flooring them', () => {
    expect(pipe.transform(1.9)).toBe('00:01');
    expect(pipe.transform(59.9)).toBe('00:59');
    expect(pipe.transform(60.5)).toBe('01:00');
    expect(pipe.transform(125.7)).toBe('02:05');
  });
});
