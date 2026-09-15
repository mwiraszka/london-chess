import { FormControl, ValidationErrors } from '@angular/forms';

import { phoneNumberValidator } from './phone-number.validator';

describe('phoneNumberValidator', () => {
  it('returns `null` for an empty string', () => {
    expect(getErrorForValue('')).toBeFalsy();
  });

  it('returns `null` if valid', () => {
    expect(getErrorForValue('123-123-1234')).toBeFalsy();
    expect(getErrorForValue('555-232-2424')).toBeFalsy();
  });

  it('returns `invalidPhoneNumberFormat` error if invalid', () => {
    const error = { invalidPhoneNumberFormat: true };

    expect(getErrorForValue('1231231234')).toEqual(error);
    expect(getErrorForValue('(123) 123 1234')).toEqual(error);
  });
});

function getErrorForValue(value: string | null): ValidationErrors | null {
  const control = new FormControl(value, phoneNumberValidator);
  return control.errors;
}
