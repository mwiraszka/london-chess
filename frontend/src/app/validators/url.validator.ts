import { AbstractControl, ValidationErrors } from '@angular/forms';

export function urlValidator(control: AbstractControl): ValidationErrors | null {
  const value = typeof control.value === 'string' ? control.value.trim() : '';
  if (!value) {
    return null;
  }
  try {
    return ['http:', 'https:'].includes(new URL(value).protocol)
      ? null
      : { invalidUrl: true };
  } catch {
    return { invalidUrl: true };
  }
}
