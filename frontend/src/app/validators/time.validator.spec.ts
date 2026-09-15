import { FormControl, ValidationErrors } from '@angular/forms';

import { timeValidator } from './time.validator';

describe('timeValidator', () => {
  it('returns `null` for an empty string', () => {
    expect(getErrorForValue('')).toBeFalsy();
  });

  // See is-valid-time.util.spec.ts for more tests
  it('returns `null` if valid', () => {
    expect(getErrorForValue('1:11 am')).toBeFalsy();
    expect(getErrorForValue('1:01 AM')).toBeFalsy();
  });

  it('returns `invalidTimeFormat` error if invalid', () => {
    const error = { invalidTimeFormat: true };

    expect(getErrorForValue('15:00 pm')).toEqual(error);
    expect(getErrorForValue('15:00')).toEqual(error);
  });
});

function getErrorForValue(value: string | null): ValidationErrors | null {
  const control = new FormControl(value, timeValidator);
  return control.errors;
}
