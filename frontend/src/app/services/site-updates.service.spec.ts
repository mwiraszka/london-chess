import { TestBed } from '@angular/core/testing';

import { SITE_UPDATES_RELEASES } from '@app/pages/site-updates/site-updates.generated';

import { SiteUpdatesService } from './site-updates.service';

describe('SiteUpdatesService', () => {
  let service: SiteUpdatesService;

  beforeEach(() => {
    localStorage.clear();

    TestBed.configureTestingModule({});
    service = TestBed.inject(SiteUpdatesService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should expose the generated releases', () => {
    expect(service.releases).toBe(SITE_UPDATES_RELEASES);
  });

  it('should clear the recent-release indicator when marked seen', () => {
    service.markLatestReleaseSeen();

    expect(service.hasRecentUnseenRelease()).toBe(false);
  });

  it('should persist the latest released version when marked seen', () => {
    const latestReleased = SITE_UPDATES_RELEASES.find(release => release.date);

    service.markLatestReleaseSeen();

    expect(localStorage.getItem('siteUpdatesLastSeenVersion')).toBe(
      latestReleased?.version ?? null,
    );
  });
});
