import { AbstractControl, ValidationErrors } from '@angular/forms';

import { UNRATED } from '@app/constants/member-details';

export function ratingValidator(control: AbstractControl): ValidationErrors | null {
  return control.value === '' ||
    control.value === UNRATED ||
    /^[1-9]\d{0,3}(?:\/\d)?$/.test(control.value)
    ? null
    : { invalidRating: true };
}
