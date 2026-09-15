import { AbstractControl, ValidationErrors } from '@angular/forms';

export function ordinalityValidator(control: AbstractControl): ValidationErrors | null {
  return control.value === '' || /^[1-9]$|^[1-9][0-9]$/.test(control.value)
    ? null
    : { invalidOrdinal: true };
}
