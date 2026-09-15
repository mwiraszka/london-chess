import { FormatBytesPipe } from './format-bytes.pipe';

describe('FormatBytesPipe', () => {
  const pipe = new FormatBytesPipe();

  it('transforms non-numeric values correctly', () => {
    expect(pipe.transform(undefined)).toBe('0 B');
    expect(pipe.transform(null)).toBe('0 B');
    expect(pipe.transform(true)).toBe('0 B');
    expect(pipe.transform(false)).toBe('0 B');
    expect(pipe.transform({})).toBe('0 B');
    expect(pipe.transform(new Date())).toBe('0 B');
    expect(pipe.transform('')).toBe('0 B');
    expect(pipe.transform('abc')).toBe('0 B');
    expect(pipe.transform('15#d$E*__f15')).toBe('0 B');
    expect(pipe.transform('15 15')).toBe('0 B');
  });

  it('transforms non-numeric values correctly when `decimalDigits` provided', () => {
    expect(pipe.transform(undefined, 0)).toBe('0 B');
    expect(pipe.transform(null, 5)).toBe('0 B');
    expect(pipe.transform(true, 0)).toBe('0 B');
    expect(pipe.transform(false, 5)).toBe('0 B');
    expect(pipe.transform({}, 0)).toBe('0 B');
    expect(pipe.transform(new Date(), 5)).toBe('0 B');
    expect(pipe.transform('', 0)).toBe('0 B');
    expect(pipe.transform('abc', 5)).toBe('0 B');
    expect(pipe.transform('15#d$E*__f15', 0)).toBe('0 B');
    expect(pipe.transform('15 15', 5)).toBe('0 B');
  });

  it('transforms numeric values correctly', () => {
    expect(pipe.transform(0)).toBe('0 B');
    expect(pipe.transform('0')).toBe('0 B');
    expect(pipe.transform(1)).toBe('1 B');
    expect(pipe.transform('1')).toBe('1 B');
    expect(pipe.transform(15)).toBe('15 B');
    expect(pipe.transform('15')).toBe('15 B');
    expect(pipe.transform(1023)).toBe('1023 B');
    expect(pipe.transform(1024)).toBe('1 kB');
    expect(pipe.transform(1025)).toBe('1 kB');
    expect(pipe.transform(1040)).toBe('1.02 kB');
    expect(pipe.transform(1_000_000)).toBe('976.56 kB');
    expect(pipe.transform('1048575')).toBe('1024 kB');
    expect(pipe.transform('1048576')).toBe('1 MB');
    expect(pipe.transform(1048577)).toBe('1 MB');
    expect(pipe.transform('1073741824')).toBe('1 GB');
    expect(pipe.transform(1_000_000_000_000)).toBe('931.32 GB');
  });

  it('transforms numeric values correctly when `decimalDigits` provided', () => {
    expect(pipe.transform(0, 0)).toBe('0 B');
    expect(pipe.transform('0', 5)).toBe('0 B');
    expect(pipe.transform(1, 0)).toBe('1 B');
    expect(pipe.transform('1', 5)).toBe('1 B');
    expect(pipe.transform(15, 0)).toBe('15 B');
    expect(pipe.transform('15', 5)).toBe('15 B');
    expect(pipe.transform(1023, 0)).toBe('1023 B');
    expect(pipe.transform(1024, 5)).toBe('1 kB');
    expect(pipe.transform(1025, 0)).toBe('1 kB');
    expect(pipe.transform(1040, 5)).toBe('1.01563 kB');
    expect(pipe.transform(1_000_000, 0)).toBe('977 kB');
    expect(pipe.transform('1048575', 5)).toBe('1023.99902 kB');
    expect(pipe.transform('1048576', 100)).toBe('1 MB');
    expect(pipe.transform(1048577, 5)).toBe('1 MB');
    expect(pipe.transform('1073741824', 0)).toBe('1 GB');
    expect(pipe.transform(1_000_000_000_000, 5)).toBe('931.32257 GB');
  });
});
