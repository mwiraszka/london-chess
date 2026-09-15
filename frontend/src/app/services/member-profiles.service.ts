import { Injectable, inject, signal } from '@angular/core';

import { MemberProfile } from '@app/models';
import { ApiService } from '@app/services/api.service';

/**
 * The members who have a profile page, looked up by member number so that names
 * and avatars always come from each member's current record.
 */
@Injectable({
  providedIn: 'root',
})
export class MemberProfilesService {
  private readonly api = inject(ApiService);

  private readonly profiles = signal<ReadonlyMap<number, MemberProfile>>(new Map());
  private loadPromise: Promise<void> | null = null;

  load(): Promise<void> {
    this.loadPromise ??= this.api
      .get<MemberProfile[]>('/public/members/profiles')
      .then(profiles => {
        this.profiles.set(new Map(profiles.map(profile => [profile.number, profile])));
      })
      .catch(() => {
        // Stored names show unlinked until a later consumer loads the profiles
        this.loadPromise = null;
      });
    return this.loadPromise;
  }

  reload(): Promise<void> {
    this.loadPromise = null;
    return this.load();
  }

  profileFor(number: number | null): MemberProfile | null {
    return number === null ? null : (this.profiles().get(number) ?? null);
  }

  avatarUrlFor(number: number | null): string | undefined {
    return this.profileFor(number)?.avatarUrl ?? undefined;
  }

  // A member's current name, or the name stored with a record when they have no profile
  nameFor(number: number | null, storedName: string): string {
    const profile = this.profileFor(number);
    return profile ? `${profile.firstName} ${profile.lastName}` : storedName;
  }
}
