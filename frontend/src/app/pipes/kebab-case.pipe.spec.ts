import { KebabCasePipe } from './kebab-case.pipe';

describe('KebabCasePipe', () => {
  const pipe = new KebabCasePipe();

  it('transforms non-string values correctly', () => {
    expect(pipe.transform(undefined)).toBe('');
    expect(pipe.transform(null)).toBe('');
    expect(pipe.transform(true)).toBe('');
    expect(pipe.transform(false)).toBe('');
    expect(pipe.transform({})).toBe('');
    expect(pipe.transform(15)).toBe('');
    expect(pipe.transform(new Date())).toBe('');
  });

  it('transforms string values correctly', () => {
    expect(pipe.transform('')).toBe('');
    expect(pipe.transform('abc')).toBe('abc');
    expect(pipe.transform('Def')).toBe('def');
    expect(pipe.transform('GHI')).toBe('ghi');
    expect(pipe.transform('(abc) def')).toBe('abc-def');
    expect(pipe.transform('DEF-gHI')).toBe('def-g-hi');
    expect(pipe.transform('a  b  c')).toBe('a-b-c');
    expect(pipe.transform('#d$E*__f')).toBe('d-e-f');
  });
});
