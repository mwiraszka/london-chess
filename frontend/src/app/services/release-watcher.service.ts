import { firstValueFrom, fromEvent } from 'rxjs';
import { filter } from 'rxjs/operators';

import { DOCUMENT } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { DestroyRef, Injectable, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { GuardsCheckEnd, Router } from '@angular/router';

import { RELEASE_VERSION } from '@app/constants/release';
import { LOAD_PAGE, RELOAD_PAGE } from '@app/tokens';

interface Release {
  version: string;
}

// Told of an older release still running after loading the newer one, which only repeats
export type StillOutdatedReport = (running: string, deployed: string) => void;

const LOADED_FOR_KEY = 'lcc.loaded-for-release';

/**
 * Brings a page left open, or restored from the browser's cache, onto the release the site
 * now serves, checking as the app starts and each time the page comes back into view. A
 * page that asks before it is left may hold unsaved changes, so there the next navigation
 * loads the new release instead.
 */
@Injectable({ providedIn: 'root' })
export class ReleaseWatcherService {
  private readonly destroyRef = inject(DestroyRef);
  private readonly document = inject(DOCUMENT);
  private readonly http = inject(HttpClient);
  private readonly loadPage = inject(LOAD_PAGE);
  private readonly reloadPage = inject(RELOAD_PAGE);
  private readonly router = inject(Router);

  private onStillOutdated: StillOutdatedReport = () => undefined;
  // The newer release the next navigation loads, on a page that may hold unsaved changes
  private pendingRelease: string | null = null;
  private hasGivenUp = false;

  public watch(onStillOutdated: StillOutdatedReport): void {
    this.onStillOutdated = onStillOutdated;
    void this.check();

    fromEvent(this.document, 'visibilitychange')
      .pipe(
        filter(() => this.document.visibilityState === 'visible'),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => void this.check());

    this.router.events
      .pipe(
        filter(
          (event): event is GuardsCheckEnd =>
            event instanceof GuardsCheckEnd && event.shouldActivate,
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(({ urlAfterRedirects }) => {
        if (this.pendingRelease && this.mayLoad(this.pendingRelease)) {
          this.loadPage(urlAfterRedirects);
        }
      });
  }

  private async check(): Promise<void> {
    if (this.hasGivenUp) {
      return;
    }
    const deployed = await this.deployedRelease();
    if (!deployed || deployed === RELEASE_VERSION) {
      return;
    }
    if (this.holdsEdits()) {
      this.pendingRelease = deployed;
    } else if (this.mayLoad(deployed)) {
      this.reloadPage();
    }
  }

  private async deployedRelease(): Promise<string | null> {
    try {
      const { version } = await firstValueFrom(
        this.http.get<Release>('/assets/release.json'),
      );
      return version;
    } catch {
      // Out of reach for now, such as offline, so the page's next return checks again
      return null;
    }
  }

  // A page that asks before it is left may hold changes a reload would lose
  private holdsEdits(): boolean {
    let route = this.router.routerState.snapshot.root;
    while (route.firstChild) {
      route = route.firstChild;
    }
    return !!route.routeConfig?.canDeactivate?.length;
  }

  // Each release is loaded once a visit: loading it again after it failed to take would
  // only repeat, and without session storage the tab could not tell that it had
  private mayLoad(deployed: string): boolean {
    try {
      if (sessionStorage.getItem(LOADED_FOR_KEY) !== deployed) {
        sessionStorage.setItem(LOADED_FOR_KEY, deployed);
        return true;
      }
      this.onStillOutdated(RELEASE_VERSION, deployed);
    } catch {
      // Session storage is off, as in some private windows
    }
    this.hasGivenUp = true;
    this.pendingRelease = null;
    return false;
  }
}
