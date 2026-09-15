import { isCollectionId } from './is-collection-id.util';

describe('isCollectionId', () => {
  it('correctly identifies CollectionId-type values', () => {
    expect(isCollectionId(undefined)).toBe(false);
    expect(isCollectionId(null)).toBe(false);
    expect(isCollectionId(true)).toBe(false);
    expect(isCollectionId(false)).toBe(false);
    expect(isCollectionId({})).toBe(false);
    expect(isCollectionId(15)).toBe(false);
    expect(isCollectionId(new Date())).toBe(false);

    expect(isCollectionId('')).toBe(false);
    expect(isCollectionId(' ')).toBe(false);
    expect(isCollectionId('abc')).toBe(false);
    expect(isCollectionId('123')).toBe(false);
    expect(isCollectionId('!?')).toBe(false);
    expect(isCollectionId('#d$E*__f')).toBe(false);
    expect(isCollectionId('abcd abcd abcd abcd abcd abcd')).toBe(false);
    expect(isCollectionId('12345678901234567890123')).toBe(false);
    expect(isCollectionId('1234567890123456789012345')).toBe(false);

    expect(isCollectionId('12345678901234567890123x')).toBe(false);
    expect(isCollectionId('12345678901234$678901234')).toBe(false);
    expect(isCollectionId('A23456789012345678901234')).toBe(false);
    expect(isCollectionId(' 23456789012345678901234')).toBe(false);

    expect(isCollectionId('123456789012345678901234')).toBe(true);
    expect(isCollectionId('12345678901234b678901234')).toBe(true);
    expect(isCollectionId('a23456789012345678901234')).toBe(true);
  });
});
