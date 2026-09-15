import { AbstractControl, ValidationErrors } from '@angular/forms';

export function ratingValidator(control: AbstractControl): ValidationErrors | null {
  return control.value === '' || /^[1-9]\d{0,3}(?:\/\d)?$/.test(control.value)
    ? null
    : { invalidRating: true };
}
