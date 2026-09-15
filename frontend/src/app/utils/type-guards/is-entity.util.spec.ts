import { isEntity } from './is-entity.util';

describe('isEntity', () => {
  it('correctly identifies Entity-type values', () => {
    expect(isEntity(undefined)).toBe(false);
    expect(isEntity(null)).toBe(false);
    expect(isEntity(true)).toBe(false);
    expect(isEntity(false)).toBe(false);
    expect(isEntity({})).toBe(false);
    expect(isEntity(15)).toBe(false);
    expect(isEntity(new Date())).toBe(false);
    expect(isEntity('')).toBe(false);
    expect(isEntity(' ')).toBe(false);
    expect(isEntity('abc')).toBe(false);
    expect(isEntity('123')).toBe(false);
    expect(isEntity('images')).toBe(false);
    expect(isEntity('members')).toBe(false);

    expect(isEntity('album')).toBe(true);
    expect(isEntity('article')).toBe(true);
    expect(isEntity('event')).toBe(true);
    expect(isEntity('image')).toBe(true);
    expect(isEntity('member')).toBe(true);
  });
});
