import { TestBed } from '@angular/core/testing';

import { WHATS_CHANGED_RELEASES } from '@app/pages/whats-changed/whats-changed.generated';

import { WhatsChangedService } from './whats-changed.service';

describe('WhatsChangedService', () => {
  let service: WhatsChangedService;

  beforeEach(() => {
    localStorage.clear();

    TestBed.configureTestingModule({});
    service = TestBed.inject(WhatsChangedService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should expose the generated releases', () => {
    expect(service.releases).toBe(WHATS_CHANGED_RELEASES);
  });

  it('should clear the recent-release indicator when marked seen', () => {
    service.markLatestReleaseSeen();

    expect(service.hasRecentUnseenRelease()).toBe(false);
  });

  it('should persist the latest released version when marked seen', () => {
    const latestReleased = WHATS_CHANGED_RELEASES.find(release => release.date);

    service.markLatestReleaseSeen();

    expect(localStorage.getItem('whatsChangedLastSeenVersion')).toBe(
      latestReleased?.version ?? null,
    );
  });
});
