import moment from 'moment-timezone';

import { Injectable, signal } from '@angular/core';

import {
  WHATS_CHANGED_LAST_SEEN_STORAGE_KEY,
  WHATS_CHANGED_RECENT_RELEASE_WINDOW_DAYS,
} from '@app/constants/whats-changed';
import { WhatsChangedRelease } from '@app/models';
import { WHATS_CHANGED_RELEASES } from '@app/pages/whats-new/whats-changed.generated';
import { isStorageSupported } from '@app/utils';

@Injectable({
  providedIn: 'root',
})
export class WhatsChangedService {
  public readonly releases: WhatsChangedRelease[] = WHATS_CHANGED_RELEASES;

  public readonly hasRecentUnseenRelease = signal<boolean>(
    this.isLatestReleaseRecentAndUnseen(),
  );

  public markLatestReleaseSeen(): void {
    const latestReleased = this.latestReleasedVersion();
    if (latestReleased && isStorageSupported()) {
      localStorage.setItem(WHATS_CHANGED_LAST_SEEN_STORAGE_KEY, latestReleased);
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
      moment().subtract(WHATS_CHANGED_RECENT_RELEASE_WINDOW_DAYS, 'days'),
    );
    if (!isRecent) {
      return false;
    }

    const lastSeen = isStorageSupported()
      ? localStorage.getItem(WHATS_CHANGED_LAST_SEEN_STORAGE_KEY)
      : null;
    return lastSeen !== latest.version;
  }
}
