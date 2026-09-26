import { TestBed } from '@angular/core/testing';

import { CamelCasePipe } from './camel-case.pipe';

describe('CamelCasePipe', () => {
  let pipe: CamelCasePipe;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [CamelCasePipe] });
    pipe = TestBed.inject(CamelCasePipe);
  });

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
    expect(pipe.transform('abc def')).toBe('abcDef');
    expect(pipe.transform('DEF-gHI')).toBe('defGHi');
    expect(pipe.transform('a  b  c')).toBe('aBC');
    expect(pipe.transform('#d$E*__f')).toBe('dEF');
  });
});
