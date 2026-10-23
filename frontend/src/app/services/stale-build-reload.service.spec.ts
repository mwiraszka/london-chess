import type { logger } from '@sentry/angular';
import { firstValueFrom } from 'rxjs';
import { filter } from 'rxjs/operators';
import type { Mock } from 'vitest';

import { Location } from '@angular/common';
import { SpyLocation, provideLocationMocks } from '@angular/common/testing';
import { Component, ErrorHandler } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { NavigationEnd, NavigationError, Router, provideRouter } from '@angular/router';

import { LOAD_PAGE, SENTRY_LOG_INFO } from '@app/tokens';
import { loadPage } from '@app/utils';

import { version } from '../../../package.json';
import { StaleBuildReloadService, isReloadedError } from './stale-build-reload.service';

@Component({ template: '' })
class BlankComponent {}

const PENDING_RELOAD_KEY = 'lcc.pendingReload';

describe('StaleBuildReloadService', () => {
  let router: Router;
  let location: SpyLocation;
  let importError: Error;
  let loadPageMock: Mock<typeof loadPage>;
  let logToSentry: Mock<typeof logger.info>;

  const pendingReload = () =>
    JSON.parse(sessionStorage.getItem(PENDING_RELOAD_KEY) ?? 'null');

  const leavePendingReloadFromPreviousPage = () =>
    sessionStorage.setItem(
      PENDING_RELOAD_KEY,
      JSON.stringify({ pageId: 'previous-page', route: '/events', version: '6.5.6' }),
    );

  const start = () => {
    TestBed.inject(StaleBuildReloadService);
    router = TestBed.inject(Router);
    location = TestBed.inject(SpyLocation);
  };

  beforeEach(() => {
    importError = new TypeError(
      'Failed to fetch dynamically imported module: https://londonchess.ca/chunk-OLD.js',
    );
    loadPageMock = vi.fn<typeof loadPage>();
    logToSentry = vi.fn<typeof logger.info>();

    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: '', component: BlankComponent },
          { path: 'about', component: BlankComponent },
          { path: 'events', loadComponent: () => Promise.reject(importError) },
        ]),
        provideLocationMocks(),
        { provide: SpyLocation, useExisting: Location },
        { provide: ErrorHandler, useValue: { handleError: vi.fn() } },
        { provide: LOAD_PAGE, useValue: loadPageMock },
        { provide: SENTRY_LOG_INFO, useValue: logToSentry },
      ],
      rethrowApplicationErrors: false,
    });
  });

  afterEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  describe('when the page being opened fails to load', () => {
    it('should load it in full as a new history entry', async () => {
      start();
      await router.navigateByUrl('/');

      await expect(router.navigateByUrl('/events')).rejects.toBe(importError);

      expect(loadPageMock).toHaveBeenCalledExactlyOnceWith('/events', { replace: false });
      expect(pendingReload()).toEqual({
        pageId: expect.any(String),
        route: '/events',
        version,
      });
    });

    it.each([
      'Failed to fetch dynamically imported module: https://londonchess.ca/chunk-OLD.js',
      'error loading dynamically imported module: https://londonchess.ca/chunk-OLD.js',
      'Importing a module script failed.',
      "'text/html' is not a valid JavaScript MIME type.",
    ])('should recognise the failure as worded "%s"', async message => {
      importError = new TypeError(message);
      start();
      await router.navigateByUrl('/');

      await expect(router.navigateByUrl('/events')).rejects.toBe(importError);

      expect(loadPageMock).toHaveBeenCalledOnce();
    });

    it('should keep the query and fragment but leave them out of the report', async () => {
      start();
      await router.navigateByUrl('/');

      await expect(router.navigateByUrl('/events?page=2#top')).rejects.toBe(importError);

      expect(loadPageMock).toHaveBeenCalledExactlyOnceWith('/events?page=2#top', {
        replace: false,
      });
      expect(pendingReload().route).toBe('/events');
    });

    it('should replace the history entry when it is the first navigation', async () => {
      start();

      await expect(router.navigateByUrl('/events')).rejects.toBe(importError);

      expect(loadPageMock).toHaveBeenCalledExactlyOnceWith('/events', { replace: true });
    });

    it('should replace the history entry when the navigation replaces the URL', async () => {
      start();
      await router.navigateByUrl('/');

      await expect(router.navigateByUrl('/events', { replaceUrl: true })).rejects.toBe(
        importError,
      );

      expect(loadPageMock).toHaveBeenCalledExactlyOnceWith('/events', { replace: true });
    });

    it('should replace the history entry when reached with Back or Forward', async () => {
      start();
      const firstNavigationEnd = firstValueFrom(
        router.events.pipe(filter(event => event instanceof NavigationEnd)),
      );
      router.initialNavigation();
      await firstNavigationEnd;
      const navigationError = firstValueFrom(
        router.events.pipe(filter(event => event instanceof NavigationError)),
      );

      location.simulateUrlPop('/events');
      await navigationError;

      expect(loadPageMock).toHaveBeenCalledExactlyOnceWith('/events', { replace: true });
    });

    it('should keep the error from Sentry', async () => {
      start();
      await router.navigateByUrl('/');

      await expect(router.navigateByUrl('/events')).rejects.toBe(importError);

      expect(isReloadedError(importError)).toBe(true);
    });
  });

  describe('when the page does not load the current build', () => {
    it('should not for any other navigation error', async () => {
      importError = new TypeError("Cannot read properties of undefined (reading 'id')");
      start();
      await router.navigateByUrl('/');

      await expect(router.navigateByUrl('/events')).rejects.toBe(importError);

      expect(loadPageMock).not.toHaveBeenCalled();
      expect(isReloadedError(importError)).toBe(false);
    });

    it('should not while offline', async () => {
      vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
      start();
      await router.navigateByUrl('/');

      await expect(router.navigateByUrl('/events')).rejects.toBe(importError);

      expect(loadPageMock).not.toHaveBeenCalled();
      expect(isReloadedError(importError)).toBe(false);
    });

    it('should not when session storage is unavailable', async () => {
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new DOMException('Storage is disabled', 'SecurityError');
      });
      start();
      await router.navigateByUrl('/');

      await expect(router.navigateByUrl('/events')).rejects.toBe(importError);

      expect(loadPageMock).not.toHaveBeenCalled();
      expect(isReloadedError(importError)).toBe(false);
    });
  });

  describe('after the reload', () => {
    it('should report the page opening on the current build', async () => {
      leavePendingReloadFromPreviousPage();
      start();

      await router.navigateByUrl('/about');

      expect(logToSentry).toHaveBeenCalledExactlyOnceWith('Stale build reload', {
        outcome: 'recovered',
        route: '/events',
        from_version: '6.5.6',
        to_version: version,
      });
      expect(pendingReload()).toBeNull();
    });

    it('should report a page that still fails and leave its error to Sentry', async () => {
      leavePendingReloadFromPreviousPage();
      start();

      await expect(router.navigateByUrl('/events')).rejects.toBe(importError);

      expect(loadPageMock).not.toHaveBeenCalled();
      expect(isReloadedError(importError)).toBe(false);
      expect(logToSentry).toHaveBeenCalledExactlyOnceWith('Stale build reload', {
        outcome: 'failed-after-reload',
        route: '/events',
        from_version: '6.5.6',
        to_version: version,
      });
      expect(pendingReload()).toBeNull();
    });

    it('should not report navigations once the outcome is known', async () => {
      leavePendingReloadFromPreviousPage();
      start();
      await router.navigateByUrl('/about');

      await router.navigateByUrl('/');

      expect(logToSentry).toHaveBeenCalledOnce();
    });
  });

  describe('when the visitor stays on the page instead of leaving it', () => {
    it('should report it once they open a page that loads', async () => {
      start();
      await router.navigateByUrl('/');
      await expect(router.navigateByUrl('/events')).rejects.toBe(importError);

      await router.navigateByUrl('/about');

      expect(logToSentry).toHaveBeenCalledExactlyOnceWith('Stale build reload', {
        outcome: 'stayed',
        route: '/events',
        from_version: version,
        to_version: version,
      });
      expect(pendingReload()).toBeNull();
    });

    it('should report it and reload again when another page fails to load', async () => {
      start();
      await router.navigateByUrl('/');
      await expect(router.navigateByUrl('/events')).rejects.toBe(importError);

      await expect(router.navigateByUrl('/events')).rejects.toBe(importError);

      expect(logToSentry).toHaveBeenCalledExactlyOnceWith('Stale build reload', {
        outcome: 'stayed',
        route: '/events',
        from_version: version,
        to_version: version,
      });
      expect(loadPageMock).toHaveBeenCalledTimes(2);
      expect(pendingReload()).not.toBeNull();
    });
  });
});
