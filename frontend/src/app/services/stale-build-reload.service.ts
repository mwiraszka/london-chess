import { Location } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { NavigationEnd, NavigationError, Router } from '@angular/router';

import { LOAD_PAGE, SENTRY_LOG_INFO } from '@app/tokens';
import { generateUuid, isStorageSupported } from '@app/utils';

import { version } from '../../../package.json';

type ReloadOutcome = 'failed-after-reload' | 'recovered' | 'stayed';

interface PendingReload {
  pageId: string;
  route: string;
  version: string;
}

const PENDING_RELOAD_KEY = 'lcc.pendingReload';

// Each browser engine words a failed dynamic import differently
const CHUNK_LOAD_FAILURES = [
  'Failed to fetch dynamically imported module', // Chromium
  'error loading dynamically imported module', // Firefox
  'Importing a module script failed', // WebKit
];

const reloadedErrors = new WeakSet<Error>();

export function isReloadedError(error: unknown): boolean {
  return error instanceof Error && reloadedErrors.has(error);
}

function isChunkLoadFailure(error: unknown): error is TypeError {
  return (
    error instanceof TypeError &&
    CHUNK_LOAD_FAILURES.some(failure => error.message.includes(failure))
  );
}

/**
 * Loads the current build in full when the code of the page being opened fails to load,
 * which is what a tab still running a build that a deploy has since replaced runs into.
 *
 * A pending reload left by another page means this page is that reload. One left by this
 * same page means the visitor chose to stay when the browser asked them to confirm leaving.
 */
@Injectable({
  providedIn: 'root',
})
export class StaleBuildReloadService {
  private readonly loadPage = inject(LOAD_PAGE);
  private readonly location = inject(Location);
  private readonly logToSentry = inject(SENTRY_LOG_INFO);
  private readonly router = inject(Router);

  private readonly canTrackReloads = isStorageSupported('sessionStorage');
  private readonly pageId = generateUuid();

  constructor() {
    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        this.settlePendingReload();
      } else if (event instanceof NavigationError && isChunkLoadFailure(event.error)) {
        this.reloadIntoCurrentBuild(event.url, event.error);
      }
    });
  }

  private settlePendingReload(): void {
    const pending = this.takePendingReload();

    if (pending) {
      this.report(pending.pageId === this.pageId ? 'stayed' : 'recovered', pending);
    }
  }

  private reloadIntoCurrentBuild(url: string, error: TypeError): void {
    const pending = this.takePendingReload();

    if (pending) {
      const isAfterReload = pending.pageId !== this.pageId;
      this.report(isAfterReload ? 'failed-after-reload' : 'stayed', pending);

      if (isAfterReload) {
        return;
      }
    }

    // Untracked, a failing reload could repeat forever, and offline it would only leave the site
    if (!this.canTrackReloads || !navigator.onLine) {
      return;
    }

    const navigation = this.router.currentNavigation();
    // A first load, Back or Forward, or a replacing navigation already has its history entry
    const replace =
      !this.router.navigated ||
      navigation?.trigger !== 'imperative' ||
      !!navigation.extras.replaceUrl;

    const reload: PendingReload = {
      pageId: this.pageId,
      route: url.replace(/[?#].*/, ''),
      version,
    };
    sessionStorage.setItem(PENDING_RELOAD_KEY, JSON.stringify(reload));
    reloadedErrors.add(error);

    this.loadPage(this.location.prepareExternalUrl(url), { replace });
  }

  private takePendingReload(): PendingReload | null {
    const value = this.canTrackReloads
      ? sessionStorage.getItem(PENDING_RELOAD_KEY)
      : null;

    if (!value) {
      return null;
    }

    sessionStorage.removeItem(PENDING_RELOAD_KEY);
    return JSON.parse(value);
  }

  private report(outcome: ReloadOutcome, pending: PendingReload): void {
    this.logToSentry('Stale build reload', {
      outcome,
      route: pending.route,
      from_version: pending.version,
      to_version: version,
    });
  }
}
