import { AbstractControl, ValidationErrors } from '@angular/forms';

export function phoneNumberValidator(control: AbstractControl): ValidationErrors | null {
  return control.value === '' || /^[1-9]\d{2}-\d{3}-\d{4}$/.test(control.value)
    ? null
    : { invalidPhoneNumberFormat: true };
}
