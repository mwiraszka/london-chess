import { isRecord } from './is-record.util';

describe('isRecord', () => {
  it('should accept objects and arrays, but not null or other values', () => {
    expect(isRecord({ message: 'Not found.' })).toBe(true);
    expect(isRecord([])).toBe(true);
    expect(isRecord(null)).toBe(false);
    expect(isRecord(undefined)).toBe(false);
    expect(isRecord('Not found.')).toBe(false);
  });
});
