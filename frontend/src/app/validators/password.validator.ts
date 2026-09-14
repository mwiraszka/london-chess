import { AbstractControl, ValidationErrors } from '@angular/forms';

import { meetsPasswordRequirements } from '@app/utils/password.util';

export function passwordValidator(control: AbstractControl): ValidationErrors | null {
  return control.value === '' || meetsPasswordRequirements(control.value)
    ? null
    : { weakPassword: true };
}
