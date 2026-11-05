import { filter } from 'rxjs/operators';

import { Injectable, inject, signal } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { NavigationEnd, Router } from '@angular/router';

import { AUTH_QUERY_PARAM, LINKABLE_AUTH_MODES } from '@app/constants/auth';
import { AuthMode } from '@app/models';
import { ClerkService } from '@app/services/clerk.service';
import { createEmailControl, createMemberAccountGroup } from '@app/utils';

// Drives the right-side auth drawer so logging in overlays the current page
// instead of a full-page takeover.
@Injectable({ providedIn: 'root' })
export class AuthDrawerService {
  private readonly clerk = inject(ClerkService);
  private readonly router = inject(Router);

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

  /**
   * Opens the drawer on the form an address asks for with ?auth=login or
   * ?auth=create-account, over the page it names, for anyone not logged in. The parameter
   * is then dropped from the address, so going back or reloading does not open it again.
   */
  listenForLinks(): void {
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => void this.openFromAddress());
  }

  async openFromAddress(): Promise<void> {
    const address = this.router.parseUrl(this.router.url);
    if (!(AUTH_QUERY_PARAM in address.queryParams)) {
      return;
    }
    const mode = LINKABLE_AUTH_MODES.find(
      linkable => linkable === address.queryParams[AUTH_QUERY_PARAM],
    );

    const queryParams = { ...address.queryParams };
    delete queryParams[AUTH_QUERY_PARAM];
    address.queryParams = queryParams;
    await this.router.navigateByUrl(address, { replaceUrl: true });

    // Whether someone is logged in is known only once Clerk has loaded, and one that fails
    // to load leaves them logged out
    await this.clerk.load().catch(() => undefined);
    if (mode && !this.clerk.isLoggedIn()) {
      this.mode.set(mode);
      this.open.set(true);
    }
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
