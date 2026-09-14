import { AbstractControl, ValidationErrors } from '@angular/forms';

// Follows the WHATWG `input[type=email]` rule so these checks agree with the
// browser's native validation, except that a dotted domain is required
export function emailValidator(control: AbstractControl): ValidationErrors | null {
  return control.value === '' ||
    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/.test(
      control.value,
    )
    ? null
    : { email: true };
}
