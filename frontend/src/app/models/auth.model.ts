import { FormControl } from '@angular/forms';

export type AuthMode = 'login' | 'create-account' | 'forgot-password';

export interface LoginResult {
  needsSecondFactor: boolean;
  needsNewPassword: boolean;
}

export type LoginStep = 'credentials' | 'second-factor' | 'new-password';

export interface NewPasswordFormGroup {
  newPassword: FormControl<string>;
  confirmPassword: FormControl<string>;
}
