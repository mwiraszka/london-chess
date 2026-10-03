import { AbstractControl, ValidationErrors } from '@angular/forms';

export function timeControlValidator(control: AbstractControl): ValidationErrors | null {
  return control.value === '' ||
    /^(?:G\d{1,3}(?:\+\d{1,2})?|\d{1,2} hours?)$/.test(control.value)
    ? null
    : { invalidTimeControl: true };
}
