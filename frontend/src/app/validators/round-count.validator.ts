import { AbstractControl, ValidationErrors } from '@angular/forms';

import { MAX_ROUND_COUNT } from '@app/constants/tournaments';

export function roundCountValidator(
  control: AbstractControl<number | null>,
): ValidationErrors | null {
  const { value } = control;
  return value === null ||
    (Number.isInteger(value) && value >= 1 && value <= MAX_ROUND_COUNT)
    ? null
    : { invalidRoundCount: true };
}
