import { TestBed } from '@angular/core/testing';

import { WHATS_NEW_RELEASES } from '@app/pages/whats-new/whats-new.generated';

import { WhatsNewService } from './whats-new.service';

describe('WhatsNewService', () => {
  let service: WhatsNewService;

  beforeEach(() => {
    localStorage.clear();

    TestBed.configureTestingModule({});
    service = TestBed.inject(WhatsNewService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should expose the generated releases', () => {
    expect(service.releases).toBe(WHATS_NEW_RELEASES);
  });

  it('should clear the recent-release indicator when marked seen', () => {
    service.markLatestReleaseSeen();

    expect(service.hasRecentUnseenRelease()).toBe(false);
  });

  it('should persist the latest released version when marked seen', () => {
    const latestReleased = WHATS_NEW_RELEASES.find(release => release.date);

    service.markLatestReleaseSeen();

    expect(localStorage.getItem('whatsNewLastSeenVersion')).toBe(
      latestReleased?.version ?? null,
    );
  });
});
