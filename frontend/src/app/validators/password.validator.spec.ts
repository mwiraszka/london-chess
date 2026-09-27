import { FormControl, ValidationErrors } from '@angular/forms';

import { passwordValidator } from './password.validator';

describe('passwordValidator', () => {
  it('returns `null` for an empty string', () => {
    expect(getErrorForValue('')).toBeNull();
  });

  it('returns `null` for a password meeting every requirement', () => {
    expect(getErrorForValue('Secret#123')).toBeNull();
  });

  it('returns `weakPassword` error when any requirement is missed', () => {
    const error = { weakPassword: true };

    expect(getErrorForValue('Sh#1')).toEqual(error);
    expect(getErrorForValue('secret#123')).toEqual(error);
    expect(getErrorForValue('Secret#abc')).toEqual(error);
    expect(getErrorForValue('Secret1234')).toEqual(error);
  });
});

function getErrorForValue(value: string): ValidationErrors | null {
  return new FormControl(value, passwordValidator).errors;
}
