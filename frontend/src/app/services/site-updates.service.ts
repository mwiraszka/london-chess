import moment from 'moment-timezone';

import { Injectable, signal } from '@angular/core';

import { SiteUpdatesRelease } from '@app/models';
import { SITE_UPDATES_RELEASES } from '@app/pages/site-updates/site-updates.generated';
import { isStorageSupported } from '@app/utils';

const LAST_SEEN_STORAGE_KEY = 'siteUpdatesLastSeenVersion';
const RECENT_RELEASE_WINDOW_DAYS = 14;

@Injectable({
  providedIn: 'root',
})
export class SiteUpdatesService {
  public readonly releases: SiteUpdatesRelease[] = SITE_UPDATES_RELEASES;

  public readonly hasRecentUnseenRelease = signal<boolean>(
    this.isLatestReleaseRecentAndUnseen(),
  );

  public markLatestReleaseSeen(): void {
    const latestReleased = this.latestReleasedVersion();
    if (latestReleased && isStorageSupported()) {
      localStorage.setItem(LAST_SEEN_STORAGE_KEY, latestReleased);
    }
    this.hasRecentUnseenRelease.set(false);
  }

  private latestReleasedVersion(): string | null {
    return this.releases.find(release => release.date)?.version ?? null;
  }

  private isLatestReleaseRecentAndUnseen(): boolean {
    const latest = this.releases.find(release => release.date);
    if (!latest?.date) {
      return false;
    }

    const isRecent = moment(latest.date).isAfter(
      moment().subtract(RECENT_RELEASE_WINDOW_DAYS, 'days'),
    );
    if (!isRecent) {
      return false;
    }

    const lastSeen = isStorageSupported()
      ? localStorage.getItem(LAST_SEEN_STORAGE_KEY)
      : null;
    return lastSeen !== latest.version;
  }
}
