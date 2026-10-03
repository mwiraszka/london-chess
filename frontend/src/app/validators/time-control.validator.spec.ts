import { FormControl, ValidationErrors } from '@angular/forms';

import { timeControlValidator } from './time-control.validator';

describe('timeControlValidator', () => {
  it('returns `null` for an empty string', () => {
    expect(getErrorForValue('')).toBeFalsy();
  });

  it('returns `null` for game-in and increment time controls, or a length in hours', () => {
    expect(getErrorForValue('G10')).toBeFalsy();
    expect(getErrorForValue('G5+3')).toBeFalsy();
    expect(getErrorForValue('G90+30')).toBeFalsy();
    expect(getErrorForValue('1 hour')).toBeFalsy();
    expect(getErrorForValue('3 hours')).toBeFalsy();
  });

  it('returns `invalidTimeControl` error if invalid', () => {
    const error = { invalidTimeControl: true };

    expect(getErrorForValue('25 minutes')).toEqual(error);
    expect(getErrorForValue('g25')).toEqual(error);
    expect(getErrorForValue('G25 + 5')).toEqual(error);
    expect(getErrorForValue('G25+')).toEqual(error);
  });
});

function getErrorForValue(value: string | null): ValidationErrors | null {
  const control = new FormControl(value, timeControlValidator);
  return control.errors;
}
