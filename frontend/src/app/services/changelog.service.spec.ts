import { TestBed } from '@angular/core/testing';

import { CHANGELOG_RELEASES } from '@app/pages/website-changelog/changelog.generated';

import { ChangelogService } from './changelog.service';

describe('ChangelogService', () => {
  let service: ChangelogService;

  beforeEach(() => {
    localStorage.clear();

    TestBed.configureTestingModule({});
    service = TestBed.inject(ChangelogService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should expose the generated releases', () => {
    expect(service.releases).toBe(CHANGELOG_RELEASES);
  });

  it('should clear the recent-release indicator when marked seen', () => {
    service.markLatestReleaseSeen();

    expect(service.hasRecentUnseenRelease()).toBe(false);
  });

  it('should persist the latest released version when marked seen', () => {
    const latestReleased = CHANGELOG_RELEASES.find(release => release.date);

    service.markLatestReleaseSeen();

    expect(localStorage.getItem('changelogLastSeenVersion')).toBe(
      latestReleased?.version ?? null,
    );
  });
});
