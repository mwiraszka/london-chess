import { areSame } from './are-same.util';

describe('areSame', () => {
  it('empty values', () => {
    expect(areSame(null, null)).toBe(true);
    expect(areSame(undefined, undefined)).toBe(true);
    expect(areSame({}, {})).toBe(true);
    expect(areSame('', '')).toBe(true);
    expect(areSame(0, 0)).toBe(true);

    expect(areSame(null, undefined)).toBe(false);
    expect(areSame(undefined, null)).toBe(false);
    expect(areSame(null, 5)).toBe(false);
    expect(areSame(5, undefined)).toBe(false);
    expect(areSame('', null)).toBe(false);
    expect(areSame(undefined, '')).toBe(false);
    expect(areSame({}, undefined)).toBe(false);
    expect(areSame('', {})).toBe(false);
    expect(areSame(null, {})).toBe(false);
    expect(areSame('', ' ')).toBe(false);
    expect(areSame(0, '')).toBe(false);
    expect(areSame(undefined, 0)).toBe(false);
    expect(areSame(0, null)).toBe(false);
    expect(areSame({}, { a: {} })).toBe(false);
  });

  it('numbers', () => {
    expect(areSame(15, 15)).toBe(true);
    expect(areSame(15, 16)).toBe(false);
  });

  it('strings', () => {
    expect(areSame('hello', 'hello')).toBe(true);
    expect(areSame(' hello ', 'hello')).toBe(false);
  });

  it('nested objects', () => {
    const a = {
      c: {
        x: 15,
        y: 'test',
        z: {},
      },
    };

    const b = {
      c: {
        y: 'test',
        z: {},
        x: 15,
      },
    };

    expect(areSame(a, b)).toBe(true);
  });

  it('objects with same `null`, `undefined` and `""` values', () => {
    const a = {
      c: {
        x: null,
        y: undefined,
        z: '',
      },
      d: {},
    };

    const b = {
      c: {
        x: null,
        y: undefined,
        z: '',
      },
      d: {},
    };

    expect(areSame(a, b)).toBe(true);
  });

  it('objects with different `null`, `undefined` and `""` values', () => {
    const a = {
      c: {
        x: null,
        y: undefined,
        z: '',
      },
    };

    const b = {
      c: {
        y: null,
        z: undefined,
        x: '',
      },
    };

    expect(areSame(a, b)).toBe(false);
  });
});
