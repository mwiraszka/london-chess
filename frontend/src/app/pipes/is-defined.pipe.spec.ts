import { IsDefinedPipe } from './is-defined.pipe';

describe('IsDefinedPipe', () => {
  const pipe = new IsDefinedPipe();

  it('transforms values correctly', () => {
    expect(pipe.transform(undefined)).toBe(false);
    expect(pipe.transform(null)).toBe(false);

    expect(pipe.transform(true)).toBe(true);
    expect(pipe.transform(false)).toBe(true);
    expect(pipe.transform({})).toBe(true);
    expect(pipe.transform(15)).toBe(true);
    expect(pipe.transform(new Date())).toBe(true);
    expect(pipe.transform('')).toBe(true);
    expect(pipe.transform(' ')).toBe(true);
    expect(pipe.transform('abc')).toBe(true);
    expect(pipe.transform('123')).toBe(true);
    expect(pipe.transform('!?')).toBe(true);
    expect(pipe.transform('#d$E*__f')).toBe(true);
  });
});
