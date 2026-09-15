import { FormGroup } from '@angular/forms';

import { MemberAccountFormGroup } from '@app/models';

import { createEmailControl } from './create-email-control.util';
import { createMemberDetailsControls } from './create-member-details-controls.util';

export function createMemberAccountGroup(): FormGroup<MemberAccountFormGroup> {
  return new FormGroup<MemberAccountFormGroup>({
    ...createMemberDetailsControls(),
    email: createEmailControl(),
  });
}
