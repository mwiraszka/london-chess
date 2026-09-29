import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

import { fromClubDateTime } from '@app/utils';

// A day that must not come before the day in a sibling control
export function notBeforeDayValidator(startControlName: string): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const start: unknown = control.parent?.get(startControlName)?.value;
    const end: unknown = control.value;
    return start instanceof Date && end instanceof Date && end < start
      ? { endBeforeStart: true }
      : null;
  };
}

// A closing time, which with its sibling day must fall after the opening day and time
export function closesAfterOpensValidator(names: {
  opensDay: string;
  opensTime: string;
  closesDay: string;
}): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = (name: string): unknown => control.parent?.get(name)?.value;
    const opensDay = value(names.opensDay);
    const opensTime = value(names.opensTime);
    const closesDay = value(names.closesDay);
    const closesTime: unknown = control.value;
    const opens =
      opensDay instanceof Date && typeof opensTime === 'string'
        ? fromClubDateTime(opensDay, opensTime)
        : null;
    const closes =
      closesDay instanceof Date && typeof closesTime === 'string'
        ? fromClubDateTime(closesDay, closesTime)
        : null;
    return opens && closes && closes <= opens ? { closesBeforeOpens: true } : null;
  };
}
