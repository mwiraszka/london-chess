import { Injectable, inject, signal } from '@angular/core';

import { ApiService } from '@app/services/api.service';

interface UserAvatarEntry {
  name: string;
  imageUrl: string | null;
}

/**
 * Name-to-avatar lookup for the users who author content, shown alongside
 * modification info on admin surfaces.
 */
@Injectable({
  providedIn: 'root',
})
export class UserAvatarsService {
  private readonly api = inject(ApiService);

  private readonly _avatars = signal<ReadonlyMap<string, string>>(new Map());
  private loadPromise: Promise<void> | null = null;

  load(): Promise<void> {
    this.loadPromise ??= this.api
      .get<UserAvatarEntry[]>('/users/avatars')
      .then(entries => {
        this._avatars.set(
          new Map(
            entries
              .filter(entry => entry.imageUrl)
              .map(entry => [entry.name.trim().toLowerCase(), entry.imageUrl as string]),
          ),
        );
      })
      .catch(() => {
        // A later consumer retries; the avatars are cosmetic
        this.loadPromise = null;
      });
    return this.loadPromise;
  }

  urlFor(name: string): string | undefined {
    return this._avatars().get(name.trim().toLowerCase());
  }
}
