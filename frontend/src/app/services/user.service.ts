import { Injectable, computed, effect, inject, signal } from '@angular/core';

import { UserRecord } from '@app/models';
import { ApiService } from '@app/services/api.service';
import { AuthDrawerService } from '@app/services/auth-drawer.service';
import { ClerkService } from '@app/services/clerk.service';

import { environment } from '@env';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private readonly api = inject(ApiService);
  private readonly authDrawer = inject(AuthDrawerService);
  private readonly clerk = inject(ClerkService);

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
        this._user.set(null);
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

  readonly memberNumber = computed(() => this._user()?.memberNumber ?? null);

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
      this._user.set(user);
      await this.syncClerkImage(user);
    } catch {
      // silently ignore; app still works without the user record
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
      this._user.set(updated);
    } catch {
      // non-critical; the app falls back to initials
    }
  }

  setUser(user: UserRecord): void {
    this._user.set(user);
  }

  clearAvatar(): void {
    const current = this._user();
    if (current) {
      this._user.set({
        ...current,
        avatarUrl: null,
        avatarOriginalUrl: null,
        avatarCropState: null,
      });
    }
  }
}
