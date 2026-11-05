import { Injectable, computed, inject, signal } from '@angular/core';

import { LoadStatus, MemberProfile, NameOrder } from '@app/models';
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
  private readonly loadStatus = signal<LoadStatus>('loading');
  private loadPromise: Promise<void> | null = null;

  readonly status = this.loadStatus.asReadonly();

  // By first name, then last
  readonly all = computed(() =>
    [...this.profiles().values()].sort(
      (a, b) =>
        a.firstName.localeCompare(b.firstName) || a.lastName.localeCompare(b.lastName),
    ),
  );

  // Profiles once loaded stay loaded through a failed reload, as they are still shown
  load(): Promise<void> {
    if (!this.loadPromise) {
      this.loadStatus.update(status => (status === 'failed' ? 'loading' : status));
      this.loadPromise = this.api
        .get<MemberProfile[]>('/public/members/profiles')
        .then(profiles => {
          this.profiles.set(new Map(profiles.map(profile => [profile.number, profile])));
          this.loadStatus.set('loaded');
        })
        .catch(() => {
          // Stored names show unlinked until a later consumer loads the profiles
          this.loadPromise = null;
          this.loadStatus.update(status => (status === 'loaded' ? status : 'failed'));
        });
    }
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

  // The member's current name in the given order, or the stored name without a profile
  nameFor(
    number: number | null,
    storedName: string,
    order: NameOrder = 'first-last',
  ): string {
    const profile = this.profileFor(number);
    if (!profile) {
      return storedName;
    }
    return order === 'last-first'
      ? `${profile.lastName}, ${profile.firstName}`
      : `${profile.firstName} ${profile.lastName}`;
  }
}
