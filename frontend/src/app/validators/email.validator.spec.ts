import { FormControl, ValidationErrors } from '@angular/forms';

import { emailValidator } from './email.validator';

describe('emailValidator', () => {
  it('returns `null` for an empty string', () => {
    expect(getErrorForValue('')).toBeFalsy();
  });

  it('returns `null` if valid', () => {
    expect(getErrorForValue('michal@test.com')).toBeFalsy();
    expect(getErrorForValue('a@b.ca')).toBeFalsy();
    expect(getErrorForValue('silly_but_valid-123++--%%@abc.1-2-3.zzzz')).toBeFalsy();
    expect(getErrorForValue('Michal@Test.com')).toBeFalsy();
    expect(getErrorForValue('michal$@test.com')).toBeFalsy();
    expect(getErrorForValue('michal@test.a')).toBeFalsy();
  });

  it('returns `email` error if invalid', () => {
    const error = { email: true };

    expect(getErrorForValue('michal@test')).toEqual(error);
    expect(getErrorForValue('michal@.com')).toEqual(error);
    expect(getErrorForValue('a@@test.ca')).toEqual(error);
    expect(getErrorForValue('a@test .ca')).toEqual(error);
    expect(getErrorForValue('<>@test.com')).toEqual(error);
    expect(getErrorForValue(' email@test.com ')).toEqual(error);
    expect(getErrorForValue('michal😎@test.com')).toEqual(error);
  });
});

function getErrorForValue(value: string): ValidationErrors | null {
  const control = new FormControl(value, emailValidator);
  return control.errors;
}
