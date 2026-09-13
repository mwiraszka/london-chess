import { Clerk } from '@clerk/clerk-js';
import { Store } from '@ngrx/store';

import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { User } from '@app/models';
import { AuthActions } from '@app/store/auth';

import { environment } from '@env';

type ClerkSession = Awaited<
  ReturnType<NonNullable<Clerk['user']>['getSessions']>
>[number];

export interface SessionInfo {
  id: string;
  isCurrent: boolean;
  device: string;
  lastActive: string;
}

export interface LoginResult {
  needsSecondFactor: boolean;
  needsNewPassword: boolean;
}

function describeSession(session: ClerkSession): string {
  const activity = session.latestActivity;
  const browser = activity?.browserName ?? 'Unknown browser';
  const os = activity?.deviceType ?? (activity?.isMobile ? 'Mobile' : 'Desktop');
  return `${browser} · ${os}`;
}

@Injectable({
  providedIn: 'root',
})
export class ClerkService {
  private readonly router = inject(Router);
  private readonly store = inject(Store);

  private clerk!: Clerk;

  readonly isLoaded = signal(false);
  readonly isLoggedIn = signal(false);
  readonly user = signal<Clerk['user']>(null, { equal: () => false });
  readonly externallyDeleted = signal(false);

  private _sessionEndExpected = false;

  async load(): Promise<void> {
    this.clerk = new Clerk(environment.clerkPublishableKey);
    // A password flagged as compromised turns the next sign-in into a pending
    // session with a reset-password task, hosted on its own route.
    // Angular router navigation so Clerk redirects (after sign-out, session
    // tasks) stay in the SPA instead of forcing a full page load
    await this.clerk.load({
      routerPush: (to: string) => void this.router.navigateByUrl(to),
      routerReplace: (to: string) =>
        void this.router.navigateByUrl(to, { replaceUrl: true }),
      taskUrls: {
        'reset-password': '/session-tasks/reset-password',
      },
    });
    this.syncState();

    this.clerk.addListener(() => this.syncState());
  }

  get client() {
    return this.clerk;
  }

  async logIn(identifier: string, password: string): Promise<LoginResult> {
    const result = await this.clerk.client!.signIn.create({
      strategy: 'password',
      identifier,
      password,
    });

    if (result.status === 'needs_second_factor') {
      await result.prepareSecondFactor({ strategy: 'email_code' });
      return { needsSecondFactor: true, needsNewPassword: false };
    }

    if (result.status === 'needs_new_password') {
      return { needsSecondFactor: false, needsNewPassword: true };
    }

    if (result.status === 'complete') {
      await this.clerk.setActive({ session: result.createdSessionId });
    }

    return { needsSecondFactor: false, needsNewPassword: false };
  }

  async verifyLoginCode(code: string): Promise<void> {
    const result = await this.clerk.client!.signIn.attemptSecondFactor({
      strategy: 'email_code',
      code,
    });

    if (result.status === 'complete') {
      await this.clerk.setActive({ session: result.createdSessionId });
    }
  }

  // Completes a sign-in that Clerk flagged with needs_new_password (a
  // temporary or compromised password that must be replaced before the
  // session is created).
  async completeNewPassword(password: string): Promise<void> {
    const result = await this.clerk.client!.signIn.resetPassword({
      password,
      signOutOfOtherSessions: true,
    });

    if (result.status === 'complete') {
      await this.clerk.setActive({ session: result.createdSessionId });
    }
  }

  expectSessionEnd(): void {
    this._sessionEndExpected = true;
  }

  async logOut(): Promise<void> {
    this._sessionEndExpected = true;
    await this.clerk.signOut();
  }

  // Resolves identically for unknown emails so the reset flow cannot be used to
  // probe which addresses have accounts.
  async sendPasswordResetCode(email: string): Promise<void> {
    try {
      await this.clerk.client!.signIn.create({
        strategy: 'reset_password_email_code',
        identifier: email,
      });
    } catch (e: unknown) {
      const code = this.errorCode(e);
      if (code !== 'form_identifier_not_found' && code !== 'strategy_for_user_invalid') {
        throw e;
      }
    }
  }

  async resetPassword(code: string, password: string): Promise<void> {
    const result = await this.clerk.client!.signIn.attemptFirstFactor({
      strategy: 'reset_password_email_code',
      code,
      password,
    });

    if (result.status === 'complete') {
      await this.clerk.setActive({ session: result.createdSessionId });
    }
  }

  async reloadUser(): Promise<void> {
    await this.clerk.user?.reload();
    this.syncState();
  }

  async getToken(): Promise<string | null> {
    return this.clerk.session?.getToken() ?? null;
  }

  async updateProfile(firstName: string, lastName: string): Promise<void> {
    await this.clerk.user!.update({ firstName, lastName });
  }

  // Adds the new address and sends a verification code to it. The change is only
  // committed once the code is verified in verifyAndSetPrimaryEmail.
  async createEmail(email: string): Promise<string> {
    const emailObj = await this.clerk.user!.createEmailAddress({ email });
    await emailObj.prepareVerification({ strategy: 'email_code' });
    return emailObj.id;
  }

  async verifyAndSetPrimaryEmail(emailId: string, code: string): Promise<void> {
    const user = this.clerk.user!;
    const emailObj = user.emailAddresses.find(e => e.id === emailId);
    if (!emailObj) {
      throw new Error('Email not found');
    }
    await emailObj.attemptVerification({ code });
    const previousId = user.primaryEmailAddressId;
    await user.update({ primaryEmailAddressId: emailId });
    if (previousId && previousId !== emailId) {
      const previous = user.emailAddresses.find(e => e.id === previousId);
      await previous?.destroy();
    }
    this.syncState();
  }

  async listSessions(): Promise<SessionInfo[]> {
    const sessions = await this.clerk.user!.getSessions();
    const currentId = this.clerk.session?.id;
    return sessions.map(session => ({
      id: session.id,
      isCurrent: session.id === currentId,
      device: describeSession(session),
      lastActive: session.lastActiveAt.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      }),
    }));
  }

  extractError(e: unknown): string {
    if (e && typeof e === 'object' && 'errors' in e) {
      const errors = (e as { errors: Array<{ code?: string; longMessage?: string }> })
        .errors;
      const error = errors[0];
      return this.friendlyMessage(error?.code, error?.longMessage);
    }
    return 'Something went wrong, please try again';
  }

  private errorCode(e: unknown): string | undefined {
    if (e && typeof e === 'object' && 'errors' in e) {
      return (e as { errors: Array<{ code?: string }> }).errors[0]?.code;
    }
    return undefined;
  }

  // A failed log in never says which half was wrong: naming the email as the
  // problem would confirm to a stranger which addresses hold accounts.
  private friendlyMessage(code?: string, fallback?: string): string {
    const messages: Record<string, string> = {
      form_identifier_not_found: 'Incorrect email or password',
      form_password_incorrect: 'Incorrect email or password',
      form_password_pwned:
        'This password has been found in a data breach, please choose a different one',
      form_password_length_too_short: 'Password must be at least 8 characters',
      form_identifier_exists: 'An account with that email already exists',
      form_code_incorrect: 'Incorrect verification code',
      form_param_format_invalid: 'Please enter a valid email address',
      form_password_not_strong_enough:
        'Password is not strong enough, please choose a stronger one',
      form_param_nil: 'Please fill in all required fields',
      strategy_for_user_invalid: 'Incorrect email or password',
      identifier_invalid: 'Please enter a valid email address',
    };

    if (code && messages[code]) {
      return messages[code];
    }

    return fallback?.replace(/\.$/, '') ?? 'Something went wrong, please try again';
  }

  private syncState(): void {
    const wasLoggedIn = this.isLoggedIn();
    const clerkUser = this.clerk.user ?? null;

    this.isLoaded.set(true);
    this.isLoggedIn.set(!!clerkUser);
    this.user.set(clerkUser);

    this.store.dispatch(
      AuthActions.userChanged({ user: clerkUser ? this.mapUser(clerkUser) : null }),
    );

    if (wasLoggedIn && !clerkUser && !this._sessionEndExpected) {
      this.externallyDeleted.set(true);
    }
  }

  private mapUser(clerkUser: NonNullable<Clerk['user']>): User {
    return {
      id: clerkUser.id,
      firstName: clerkUser.firstName ?? '',
      lastName: clerkUser.lastName ?? '',
      email: clerkUser.primaryEmailAddress?.emailAddress ?? '',
      isAdmin: clerkUser.publicMetadata['isAdmin'] === true,
    };
  }
}
