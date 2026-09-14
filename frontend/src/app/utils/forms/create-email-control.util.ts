import { FormControl, Validators } from '@angular/forms';

import { emailValidator } from '@app/validators';

export function createEmailControl(): FormControl<string> {
  return new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, emailValidator],
  });
}
