import { AbstractControl, ValidationErrors } from '@angular/forms';

export function idValidator(control: AbstractControl): ValidationErrors | null {
  return control.value === '' || /^[a-fA-F0-9]{24}$/.test(control.value)
    ? null
    : { invalidId: true };
}
