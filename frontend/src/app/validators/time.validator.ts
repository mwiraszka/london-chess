import { AbstractControl, ValidationErrors } from '@angular/forms';

import { isValidTime } from '@app/utils';

export function timeValidator(control: AbstractControl): ValidationErrors | null {
  return control.value === '' || isValidTime(control.value)
    ? null
    : { invalidTimeFormat: true };
}
