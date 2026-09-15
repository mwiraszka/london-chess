import { FormControl, Validators } from '@angular/forms';

import { VERIFICATION_CODE_LENGTH } from '@app/constants/auth';

export function createVerificationCodeControl(): FormControl<string> {
  return new FormControl('', {
    nonNullable: true,
    validators: [
      Validators.required,
      Validators.minLength(VERIFICATION_CODE_LENGTH),
      Validators.maxLength(VERIFICATION_CODE_LENGTH),
    ],
  });
}
