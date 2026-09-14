import moment from 'moment-timezone';

import { Injectable, signal } from '@angular/core';

import {
  CHANGELOG_LAST_SEEN_STORAGE_KEY,
  CHANGELOG_RECENT_RELEASE_WINDOW_DAYS,
} from '@app/constants/changelog';
import { ChangelogRelease } from '@app/models';
import { CHANGELOG_RELEASES } from '@app/pages/website-changelog/changelog.generated';
import { isStorageSupported } from '@app/utils';

@Injectable({
  providedIn: 'root',
})
export class ChangelogService {
  public readonly releases: ChangelogRelease[] = CHANGELOG_RELEASES;

  public readonly hasRecentUnseenRelease = signal<boolean>(
    this.isLatestReleaseRecentAndUnseen(),
  );

  public markLatestReleaseSeen(): void {
    const latestReleased = this.latestReleasedVersion();
    if (latestReleased && isStorageSupported()) {
      localStorage.setItem(CHANGELOG_LAST_SEEN_STORAGE_KEY, latestReleased);
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
      moment().subtract(CHANGELOG_RECENT_RELEASE_WINDOW_DAYS, 'days'),
    );
    if (!isRecent) {
      return false;
    }

    const lastSeen = isStorageSupported()
      ? localStorage.getItem(CHANGELOG_LAST_SEEN_STORAGE_KEY)
      : null;
    return lastSeen !== latest.version;
  }
}
