import { FormControl, ValidationErrors } from '@angular/forms';

import { roundCountValidator } from './round-count.validator';

describe('roundCountValidator', () => {
  it('returns `null` when no rounds are set', () => {
    expect(getErrorForValue(null)).toBeFalsy();
  });

  it('returns `null` for a whole number of rounds the server stores', () => {
    expect(getErrorForValue(1)).toBeFalsy();
    expect(getErrorForValue(7)).toBeFalsy();
    expect(getErrorForValue(30)).toBeFalsy();
  });

  it('returns `invalidRoundCount` error if invalid', () => {
    const error = { invalidRoundCount: true };

    expect(getErrorForValue(0)).toEqual(error);
    expect(getErrorForValue(31)).toEqual(error);
    expect(getErrorForValue(4.5)).toEqual(error);
  });
});

function getErrorForValue(value: number | null): ValidationErrors | null {
  const control = new FormControl(value, roundCountValidator);
  return control.errors;
}
