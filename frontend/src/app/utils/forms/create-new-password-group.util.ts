import { FormControl, FormGroup, Validators } from '@angular/forms';

import { NewPasswordFormGroup } from '@app/models';
import { passwordValidator, passwordsMatchValidator } from '@app/validators';

export function createNewPasswordGroup(): FormGroup<NewPasswordFormGroup> {
  return new FormGroup(
    {
      newPassword: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, passwordValidator],
      }),
      confirmPassword: new FormControl('', {
        nonNullable: true,
        validators: Validators.required,
      }),
    },
    { validators: passwordsMatchValidator },
  );
}
