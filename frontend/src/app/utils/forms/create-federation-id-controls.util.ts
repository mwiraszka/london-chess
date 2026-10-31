import { FormControl, Validators } from '@angular/forms';

import { MEMBER_DETAIL_RULES } from '@app/constants/member-details';
import { FederationIdsFormGroup } from '@app/models';

export function createFederationIdControls(): FederationIdsFormGroup {
  return {
    fideId: new FormControl('', {
      nonNullable: true,
      validators: Validators.pattern(MEMBER_DETAIL_RULES.fideId.pattern),
    }),
    cfcId: new FormControl('', {
      nonNullable: true,
      validators: Validators.pattern(MEMBER_DETAIL_RULES.cfcId.pattern),
    }),
  };
}
