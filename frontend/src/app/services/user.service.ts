import { Store } from '@ngrx/store';

import { Injectable, computed, effect, inject, signal } from '@angular/core';

import { User, UserRecord } from '@app/models';
import { ApiService } from '@app/services/api.service';
import { AuthDrawerService } from '@app/services/auth-drawer.service';
import { ClerkService } from '@app/services/clerk.service';
import { AuthActions } from '@app/store/auth';

import { environment } from '@env';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private readonly api = inject(ApiService);
  private readonly authDrawer = inject(AuthDrawerService);
  private readonly clerk = inject(ClerkService);
  private readonly store = inject(Store);

  private readonly _user = signal<UserRecord | null>(null);
  private loadPromise: Promise<void> | null = null;

  readonly user = this._user.asReadonly();

  constructor() {
    // Load the record on login and clear it on logout so the avatar and role
    // are correct app-wide, not just where a page happens to fetch it.
    effect(() => {
      if (this.clerk.isLoggedIn()) {
        void this.load();
      } else {
        this.setRecord(null);
      }
    });
  }

  // Uncropped original for the avatar editor, served through the API rather
  // than R2 directly: the editor draws into a canvas, so the image must come
  // from a CORS-enabled origin, and R2's public dev domain sends no CORS
  // headers. The key is stable so a cache-buster forces a reload after re-upload.
  readonly fullSizeAvatarUrl = computed((): string | undefined => {
    const user = this._user();
    if (user?.avatarOriginalUrl) {
      const cacheBuster = user.avatarUpdatedAt
        ? new Date(user.avatarUpdatedAt).getTime()
        : 0;
      return `${environment.lccApiBaseUrl}/users/${user.id}/avatar?t=${cacheBuster}`;
    }
    return undefined;
  });

  readonly avatarUrl = computed((): string | undefined => {
    return this.fullSizeAvatarUrl() ?? this.clerkAvatarUrl();
  });

  private readonly clerkAvatarUrl = computed((): string | undefined => {
    const clerkUser = this.clerk.user();
    return clerkUser?.hasImage ? clerkUser.imageUrl : undefined;
  });

  readonly avatarCropState = computed(() => this._user()?.avatarCropState ?? null);

  readonly hasAvatar = computed(() => !!this.avatarUrl());

  // Calls made while a load is in flight share it, so a record fetched at log in can
  // never land after a newer one
  load(): Promise<void> {
    this.loadPromise ??= this.fetchUser().finally(() => {
      this.loadPromise = null;
    });
    return this.loadPromise;
  }

  private async fetchUser(): Promise<void> {
    if (!this.clerk.isLoggedIn()) {
      return;
    }
    try {
      const user = await this.api.get<UserRecord>('/users/me');
      // The password the site emailed is replaced in the log in drawer before the site
      // can be used, so a session that skipped that step is ended
      if (user.hasTemporaryPassword && !this.authDrawer.isCompletingLogin()) {
        await this.clerk.logOut();
        return;
      }
      this.setRecord(user);
      await this.syncClerkImage(user);
    } catch (error) {
      // Without the record the visit carries on as logged out, as admin rights and
      // credit for edits come from it
      console.error(`[LCC] Unable to load the signed-in member's record: ${error}`);
    }
  }

  // Keep the stored Clerk image URL fresh so the app can fall back to it when
  // there is no app-cropped avatar.
  private async syncClerkImage(user: UserRecord): Promise<void> {
    const clerkUser = this.clerk.user();
    if (!clerkUser) {
      return;
    }
    const current = clerkUser.hasImage ? clerkUser.imageUrl : null;
    if (current === user.clerkImageUrl) {
      return;
    }
    try {
      const updated = await this.api.patch<UserRecord>('/users/me', {
        clerkImageUrl: current,
      });
      this.setRecord(updated);
    } catch {
      // non-critical; the app falls back to initials
    }
  }

  setUser(user: UserRecord): void {
    this.setRecord(user);
  }

  clearAvatar(): void {
    const current = this._user();
    if (current) {
      this.setRecord({
        ...current,
        avatarUrl: null,
        avatarOriginalUrl: null,
        avatarCropState: null,
      });
    }
  }

  // The store's user is the record's, so admin rights follow what the API enforces
  private setRecord(record: UserRecord | null): void {
    this._user.set(record);
    this.store.dispatch(AuthActions.userChanged({ user: record && toUser(record) }));
  }
}

function toUser({
  id,
  firstName,
  lastName,
  email,
  isAdmin,
  memberNumber,
}: UserRecord): User {
  return { id, firstName, lastName, email, isAdmin, memberNumber };
}
