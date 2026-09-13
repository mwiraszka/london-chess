import { Injectable, signal } from '@angular/core';

export type AuthMode = 'login' | 'create-account' | 'forgot-password';

// Drives the right-side auth drawer so logging in overlays the current page
// instead of a full-page takeover.
@Injectable({ providedIn: 'root' })
export class AuthDrawerService {
  readonly open = signal(false);
  readonly mode = signal<AuthMode>('login');

  // Field drafts live here rather than in the form components, so switching
  // between the forms and back keeps whatever was typed
  readonly loginDraft = {
    email: signal(''),
    password: signal(''),
  };

  readonly createAccountDraft = {
    firstName: signal(''),
    lastName: signal(''),
    email: signal(''),
    yearOfBirth: signal<number | null>(null),
    city: signal(''),
    phoneNumber: signal(''),
    lichessUsername: signal(''),
    chessComUsername: signal(''),
  };

  clearDrafts(): void {
    this.loginDraft.email.set('');
    this.loginDraft.password.set('');
    this.createAccountDraft.firstName.set('');
    this.createAccountDraft.lastName.set('');
    this.createAccountDraft.email.set('');
    this.createAccountDraft.yearOfBirth.set(null);
    this.createAccountDraft.city.set('');
    this.createAccountDraft.phoneNumber.set('');
    this.createAccountDraft.lichessUsername.set('');
    this.createAccountDraft.chessComUsername.set('');
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
