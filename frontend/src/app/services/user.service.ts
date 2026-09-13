import { type AvatarEditorCropState } from '@eagami/ui';

import { Injectable, computed, effect, inject, signal } from '@angular/core';

import { ApiService } from '@app/services/api.service';
import { ClerkService } from '@app/services/clerk.service';

import { environment } from '@env';

export interface UserRecord {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  isAdmin: boolean;
  clerkImageUrl: string | null;
  avatarUrl: string | null;
  avatarOriginalUrl: string | null;
  avatarCropState: AvatarEditorCropState | null;
  lastModifiedDate: string;
}

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private readonly api = inject(ApiService);
  private readonly clerk = inject(ClerkService);

  private readonly _user = signal<UserRecord | null>(null);

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
      const cacheBuster = new Date(user.lastModifiedDate).getTime();
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

  async load(): Promise<void> {
    if (!this.clerk.isLoggedIn()) {
      return;
    }
    try {
      const user = await this.api.get<UserRecord>('/users/me');
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
