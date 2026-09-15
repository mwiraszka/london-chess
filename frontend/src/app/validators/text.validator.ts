import { AbstractControl, ValidationErrors } from '@angular/forms';

export function textValidator(control: AbstractControl): ValidationErrors | null {
  return control.value === '' ||
    // eslint-disable-next-line no-misleading-character-class
    /^[\p{L}\p{N}\p{P}\p{S}\s\u{200D}\u{FE0F}]+$/u.test(control.value)
    ? null
    : { invalidText: true };
}
