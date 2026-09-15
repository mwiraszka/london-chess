import { TruncateByCharsPipe } from './truncate-by-chars.pipe';

describe('TruncateByCharsPipe', () => {
  const pipe = new TruncateByCharsPipe();

  it('handles `undefined` values correctly', () => {
    expect(pipe.transform(undefined)).toBe('');
    expect(pipe.transform(undefined, undefined)).toBe('');
    expect(pipe.transform('some text', undefined)).toBe('');
  });

  it('handles string values correctly when `withEllipsis` is set to `true`', () => {
    expect(pipe.transform('some text', -5)).toBe('');
    expect(pipe.transform('some text', -1)).toBe('');
    expect(pipe.transform('some text', 0)).toBe('');
    expect(pipe.transform('some text', 1)).toBe('.');
    expect(pipe.transform('some text', 2)).toBe('..');
    expect(pipe.transform('some text', 3)).toBe('...');
    expect(pipe.transform('some text', 4)).toBe('s...');
    expect(pipe.transform('some text', 5)).toBe('so...');
    expect(pipe.transform('some text', 9)).toBe('some text');
    expect(pipe.transform('some text', 10)).toBe('some text');
    expect(pipe.transform('some text', 100)).toBe('some text');
  });

  it('handles string values correctly when `withEllipsis` is set to `false`', () => {
    expect(pipe.transform('some text', -5, false)).toBe('');
    expect(pipe.transform('some text', -1, false)).toBe('');
    expect(pipe.transform('some text', 0, false)).toBe('');
    expect(pipe.transform('some text', 1, false)).toBe('s');
    expect(pipe.transform('some text', 2, false)).toBe('so');
    expect(pipe.transform('some text', 9, false)).toBe('some text');
    expect(pipe.transform('some text', 10, false)).toBe('some text');
    expect(pipe.transform('some text', 100, false)).toBe('some text');
  });
});
