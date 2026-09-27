import { FormControl, FormGroup, ValidationErrors } from '@angular/forms';

import { passwordsMatchValidator } from './passwords-match.validator';

describe('passwordsMatchValidator', () => {
  it('returns `null` while the confirmation is empty', () => {
    expect(getErrorForValues('Secret#123', '')).toBeNull();
  });

  it('returns `null` when the passwords match', () => {
    expect(getErrorForValues('Secret#123', 'Secret#123')).toBeNull();
  });

  it('returns `passwordMismatch` error when the passwords differ', () => {
    expect(getErrorForValues('Secret#123', 'Secret#124')).toEqual({
      passwordMismatch: true,
    });
  });
});

function getErrorForValues(
  newPassword: string,
  confirmPassword: string,
): ValidationErrors | null {
  return new FormGroup(
    {
      newPassword: new FormControl(newPassword, { nonNullable: true }),
      confirmPassword: new FormControl(confirmPassword, { nonNullable: true }),
    },
    { validators: passwordsMatchValidator },
  ).errors;
}
