import { FormControl, ValidationErrors } from '@angular/forms';

import { yearOfBirthValidator } from './year-of-birth.validator';

describe('yearOfBirthValidator', () => {
  it('returns `null` for an empty string', () => {
    expect(getErrorForValue('')).toBeFalsy();
  });

  it('returns `null` if valid', () => {
    expect(getErrorForValue('2024')).toBeFalsy();
    expect(getErrorForValue('1999')).toBeFalsy();
    expect(getErrorForValue('1900')).toBeFalsy();
    expect(getErrorForValue(String(new Date().getFullYear()))).toBeFalsy();
  });

  it('returns `invalidYearOfBirth` error if invalid', () => {
    const error = { invalidYearOfBirth: true };

    expect(getErrorForValue('a')).toEqual(error);
    expect(getErrorForValue('Abc123$')).toEqual(error);
    expect(getErrorForValue('100')).toEqual(error);
    expect(getErrorForValue('1899')).toEqual(error);
    expect(getErrorForValue(String(new Date().getFullYear() + 1))).toEqual(error);
  });
});

function getErrorForValue(value: string | null): ValidationErrors | null {
  const control = new FormControl(value, yearOfBirthValidator);
  return control.errors;
}
