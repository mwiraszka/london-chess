import { parseRecordNumber } from './parse-record-number.util';

describe('parseRecordNumber', () => {
  it('should read a number written as digits', () => {
    expect(parseRecordNumber('184')).toBe(184);
    expect(parseRecordNumber('007')).toBe(7);
  });

  it('should refuse anything else', () => {
    expect(parseRecordNumber('')).toBeNull();
    expect(parseRecordNumber('12a')).toBeNull();
    expect(parseRecordNumber('-3')).toBeNull();
    expect(parseRecordNumber('1.5')).toBeNull();
  });
});
