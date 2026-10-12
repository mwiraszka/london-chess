import { AbstractControl, ValidationErrors } from '@angular/forms';

export function timeControlValidator(control: AbstractControl): ValidationErrors | null {
  return control.value === '' ||
    /^(?:G[1-9]\d{0,2}(?:\+\d{1,2})?|[1-9]\d? hours?)$/.test(control.value)
    ? null
    : { invalidTimeControl: true };
}
