import { FormControl, ValidationErrors } from '@angular/forms';

import { idValidator } from './id.validator';

describe('idValidator', () => {
  it('returns `null` for an empty string', () => {
    expect(getErrorForValue('')).toBeFalsy();
  });

  it('returns `null` if valid', () => {
    expect(getErrorForValue('507f1f77bcf86cd799439011')).toBeFalsy();
    expect(getErrorForValue('507f191e810c19729de860ea')).toBeFalsy();
    expect(getErrorForValue('abcdef1234567890ABCDEF12')).toBeFalsy();
  });

  it('returns `invalidId` error if invalid', () => {
    const error = { invalidId: true };

    expect(getErrorForValue('507f1f77bcf86cd79943901')).toEqual(error); // Too short (23 chars)
    expect(getErrorForValue('507f1f77bcf86cd7994390111')).toEqual(error); // Too long (25 chars)
    expect(getErrorForValue('507f1f77bcf86cd79943901g')).toEqual(error); // Invalid character 'g'
    expect(getErrorForValue('507f1f77-bcf8-6cd7-9943-9011')).toEqual(error); // Contains hyphens
    expect(getErrorForValue('not-a-valid-id-format')).toEqual(error);
  });
});

function getErrorForValue(value: string | null): ValidationErrors | null {
  const control = new FormControl(value, idValidator);
  return control.errors;
}
