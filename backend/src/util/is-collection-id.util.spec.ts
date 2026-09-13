import { isCollectionId } from './is-collection-id.util';

describe('isCollectionId', () => {
  it('accepts only 24-character hex strings', () => {
    expect(isCollectionId(undefined)).toBe(false);
    expect(isCollectionId(null)).toBe(false);
    expect(isCollectionId(15)).toBe(false);
    expect(isCollectionId('')).toBe(false);
    expect(isCollectionId('account')).toBe(false);
    expect(isCollectionId('12345678901234567890123')).toBe(false);
    expect(isCollectionId('1234567890123456789012345')).toBe(false);
    expect(isCollectionId('12345678901234567890123x')).toBe(false);

    expect(isCollectionId('679ee6771f33be5bf17b6d66')).toBe(true);
    expect(isCollectionId('679EE6771F33BE5BF17B6D66')).toBe(true);
  });
});
