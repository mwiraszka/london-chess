import { FormControl, Validators } from '@angular/forms';

import { MEMBER_DETAIL_RULES, MIN_YEAR_OF_BIRTH } from '@app/constants/member-details';
import { MemberDetailsFormGroup } from '@app/models';

export function createMemberDetailsControls(): MemberDetailsFormGroup {
  return {
    firstName: new FormControl('', {
      nonNullable: true,
      validators: Validators.required,
    }),
    lastName: new FormControl('', { nonNullable: true, validators: Validators.required }),
    yearOfBirth: new FormControl<number | null>(null, {
      validators: [
        Validators.required,
        Validators.min(MIN_YEAR_OF_BIRTH),
        Validators.max(new Date().getFullYear()),
      ],
    }),
    city: new FormControl('', { nonNullable: true, validators: Validators.required }),
    phoneNumber: new FormControl('', {
      nonNullable: true,
      validators: Validators.pattern(MEMBER_DETAIL_RULES.phoneNumber.pattern),
    }),
    lichessUsername: new FormControl('', {
      nonNullable: true,
      validators: Validators.pattern(MEMBER_DETAIL_RULES.lichessUsername.pattern),
    }),
    chessComUsername: new FormControl('', {
      nonNullable: true,
      validators: Validators.pattern(MEMBER_DETAIL_RULES.chessComUsername.pattern),
    }),
  };
}
