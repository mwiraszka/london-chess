import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { RELEASE_VERSION } from '@app/constants/release';
import { LOAD_PAGE, RELOAD_PAGE } from '@app/tokens';

import { ReleaseWatcherService, StillOutdatedReport } from './release-watcher.service';

@Component({ template: '' })
class BlankPageComponent {}

describe('ReleaseWatcherService', () => {
  let httpMock: HttpTestingController;
  let loadPage: Mock<void, [string]>;
  let reloadPage: Mock<void, []>;
  let onStillOutdated: Mock<void, Parameters<StillOutdatedReport>>;

  const NEWER = '99.0.0';

  // Everything left to run is already queued as microtasks, which a turn of the event
  // loop drains in full
  const drainMicrotasks = () => new Promise(resolve => setTimeout(resolve));

  async function answerCheck(version: string): Promise<void> {
    httpMock.expectOne('/assets/release.json').flush({ version });
    await drainMicrotasks();
  }

  async function startOn(url: string): Promise<void> {
    await TestBed.inject(Router).navigateByUrl(url);
    TestBed.inject(ReleaseWatcherService).watch(onStillOutdated);
  }

  function comeBackIntoView(): void {
    document.dispatchEvent(new Event('visibilitychange'));
  }

  beforeEach(() => {
    loadPage = vi.fn<(url: string) => void>();
    reloadPage = vi.fn<() => void>();
    onStillOutdated = vi.fn<StillOutdatedReport>();
    sessionStorage.clear();
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => 'visible',
    });

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([
          { path: 'schedule', component: BlankPageComponent },
          {
            path: 'event/edit',
            component: BlankPageComponent,
            canDeactivate: [() => true],
          },
        ]),
        { provide: LOAD_PAGE, useValue: loadPage },
        { provide: RELOAD_PAGE, useValue: reloadPage },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    sessionStorage.clear();
    Reflect.deleteProperty(document, 'visibilityState');
  });

  it('should stay on the release the site serves', async () => {
    await startOn('/schedule');

    await answerCheck(RELEASE_VERSION);

    expect(reloadPage).not.toHaveBeenCalled();
  });

  it('should reload onto a newer release found as it starts', async () => {
    await startOn('/schedule');

    await answerCheck(NEWER);

    expect(reloadPage).toHaveBeenCalledOnce();
  });

  it('should check again each time the page comes back into view', async () => {
    await startOn('/schedule');
    await answerCheck(RELEASE_VERSION);

    comeBackIntoView();
    await answerCheck(NEWER);

    expect(reloadPage).toHaveBeenCalledOnce();
  });

  it('should leave the page as it is while the release cannot be fetched', async () => {
    await startOn('/schedule');

    httpMock
      .expectOne('/assets/release.json')
      .flush('', { status: 503, statusText: 'Unavailable' });
    await drainMicrotasks();

    expect(reloadPage).not.toHaveBeenCalled();
  });

  it('should keep a page that may hold changes until the next navigation, then load it', async () => {
    await startOn('/event/edit');
    await answerCheck(NEWER);
    const reloadedEarly = reloadPage.mock.calls.length;

    await TestBed.inject(Router).navigateByUrl('/schedule');

    expect(reloadedEarly).toBe(0);
    expect(loadPage).toHaveBeenCalledExactlyOnceWith('/schedule');
  });

  it('should load each release once a visit, and report one that did not take', async () => {
    sessionStorage.setItem('lcc.loaded-for-release', NEWER);
    await startOn('/schedule');

    await answerCheck(NEWER);
    comeBackIntoView();

    expect(reloadPage).not.toHaveBeenCalled();
    expect(onStillOutdated).toHaveBeenCalledExactlyOnceWith(RELEASE_VERSION, NEWER);
  });
});
