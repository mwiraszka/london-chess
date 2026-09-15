import { AbstractControl, ValidationErrors } from '@angular/forms';

import { MIN_YEAR_OF_BIRTH } from '@app/constants/member-details';

export function yearOfBirthValidator(control: AbstractControl): ValidationErrors | null {
  if (control.value === '') {
    return null;
  }

  const year = Number(control.value);

  return /^\d{4}$/.test(control.value) &&
    year >= MIN_YEAR_OF_BIRTH &&
    year <= new Date().getFullYear()
    ? null
    : { invalidYearOfBirth: true };
}
