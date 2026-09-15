import { Injectable, signal } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';

import { AuthMode } from '@app/models';
import { createEmailControl, createMemberAccountGroup } from '@app/utils';

// Drives the right-side auth drawer so logging in overlays the current page
// instead of a full-page takeover.
@Injectable({ providedIn: 'root' })
export class AuthDrawerService {
  readonly open = signal(false);
  readonly mode = signal<AuthMode>('login');
  // True while the drawer finishes a log in, which can include replacing the password
  // the site emailed before the member may use the site
  readonly isCompletingLogin = signal(false);

  // The forms live here rather than in the form components, so switching
  // between the forms and back keeps whatever was typed
  readonly loginForm = new FormGroup({
    email: createEmailControl(),
    password: new FormControl('', { nonNullable: true, validators: Validators.required }),
  });

  readonly createAccountForm = createMemberAccountGroup();

  resetForms(): void {
    this.loginForm.reset();
    this.createAccountForm.reset();
  }

  openLogin(): void {
    this.mode.set('login');
    this.open.set(true);
  }

  setMode(mode: AuthMode): void {
    this.mode.set(mode);
  }

  close(): void {
    this.open.set(false);
    // Reset so a later open without an explicit mode falls back to login rather
    // than reappearing in whatever sub-flow it was left in.
    this.mode.set('login');
  }
}
