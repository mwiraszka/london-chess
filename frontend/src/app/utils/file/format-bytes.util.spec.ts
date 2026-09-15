import { formatBytes } from './format-bytes.util';

describe('formatBytes', () => {
  it('handles non-numeric values correctly', () => {
    expect(formatBytes(undefined)).toBe('0 B');
    expect(formatBytes(null)).toBe('0 B');
    expect(formatBytes(true)).toBe('0 B');
    expect(formatBytes(false)).toBe('0 B');
    expect(formatBytes({})).toBe('0 B');
    expect(formatBytes(new Date())).toBe('0 B');
    expect(formatBytes('')).toBe('0 B');
    expect(formatBytes('abc')).toBe('0 B');
    expect(formatBytes('15#d$E*__f15')).toBe('0 B');
    expect(formatBytes('15 15')).toBe('0 B');
  });

  it('handles non-numeric values correctly when `decimalDigits` provided', () => {
    expect(formatBytes(undefined, 0)).toBe('0 B');
    expect(formatBytes(null, 5)).toBe('0 B');
    expect(formatBytes(true, 0)).toBe('0 B');
    expect(formatBytes(false, 5)).toBe('0 B');
    expect(formatBytes({}, 0)).toBe('0 B');
    expect(formatBytes(new Date(), 5)).toBe('0 B');
    expect(formatBytes('', 0)).toBe('0 B');
    expect(formatBytes('abc', 5)).toBe('0 B');
    expect(formatBytes('15#d$E*__f15', 0)).toBe('0 B');
    expect(formatBytes('15 15', 5)).toBe('0 B');
  });

  it('formats numeric values correctly', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes('0')).toBe('0 B');
    expect(formatBytes(1)).toBe('1 B');
    expect(formatBytes('1')).toBe('1 B');
    expect(formatBytes(15)).toBe('15 B');
    expect(formatBytes('15')).toBe('15 B');
    expect(formatBytes(1023)).toBe('1023 B');
    expect(formatBytes(1024)).toBe('1 kB');
    expect(formatBytes(1025)).toBe('1 kB');
    expect(formatBytes(1040)).toBe('1.02 kB');
    expect(formatBytes(1_000_000)).toBe('976.56 kB');
    expect(formatBytes('1048575')).toBe('1024 kB');
    expect(formatBytes('1048576')).toBe('1 MB');
    expect(formatBytes(1048577)).toBe('1 MB');
    expect(formatBytes('1073741824')).toBe('1 GB');
    expect(formatBytes(1_000_000_000_000)).toBe('931.32 GB');
  });

  it('formats numeric values correctly when `decimalDigits` provided', () => {
    expect(formatBytes(0, 0)).toBe('0 B');
    expect(formatBytes('0', 5)).toBe('0 B');
    expect(formatBytes(1, 0)).toBe('1 B');
    expect(formatBytes('1', 5)).toBe('1 B');
    expect(formatBytes(15, 0)).toBe('15 B');
    expect(formatBytes('15', 5)).toBe('15 B');
    expect(formatBytes(1023, 0)).toBe('1023 B');
    expect(formatBytes(1024, 5)).toBe('1 kB');
    expect(formatBytes(1025, 0)).toBe('1 kB');
    expect(formatBytes(1040, 5)).toBe('1.01563 kB');
    expect(formatBytes(1_000_000, 0)).toBe('977 kB');
    expect(formatBytes('1048575', 5)).toBe('1023.99902 kB');
    expect(formatBytes('1048576', 100)).toBe('1 MB');
    expect(formatBytes(1048577, 5)).toBe('1 MB');
    expect(formatBytes('1073741824', 0)).toBe('1 GB');
    expect(formatBytes(1_000_000_000_000, 5)).toBe('931.32257 GB');
  });
});
