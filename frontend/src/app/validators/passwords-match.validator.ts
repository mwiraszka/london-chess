import { AbstractControl, ValidationErrors } from '@angular/forms';

export function passwordsMatchValidator(
  group: AbstractControl<{ newPassword: string; confirmPassword: string }>,
): ValidationErrors | null {
  const { newPassword, confirmPassword } = group.value;

  return confirmPassword === '' || confirmPassword === newPassword
    ? null
    : { passwordMismatch: true };
}
