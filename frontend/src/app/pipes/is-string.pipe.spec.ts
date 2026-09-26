import { TestBed } from '@angular/core/testing';

import { IsStringPipe } from './is-string.pipe';

describe('IsStringPipe', () => {
  let pipe: IsStringPipe;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [IsStringPipe] });
    pipe = TestBed.inject(IsStringPipe);
  });

  it('transforms values correctly', () => {
    expect(pipe.transform(undefined)).toBe(false);
    expect(pipe.transform(null)).toBe(false);
    expect(pipe.transform(true)).toBe(false);
    expect(pipe.transform(false)).toBe(false);
    expect(pipe.transform({})).toBe(false);
    expect(pipe.transform(15)).toBe(false);
    expect(pipe.transform(new Date())).toBe(false);

    expect(pipe.transform('')).toBe(true);
    expect(pipe.transform(' ')).toBe(true);
    expect(pipe.transform('abc')).toBe(true);
    expect(pipe.transform('123')).toBe(true);
    expect(pipe.transform('!?')).toBe(true);
    expect(pipe.transform('#d$E*__f')).toBe(true);
  });
});
