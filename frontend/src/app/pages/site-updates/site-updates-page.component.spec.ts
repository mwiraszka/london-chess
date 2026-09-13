import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MetaAndTitleService, SiteUpdatesService } from '@app/services';
import { queryAll, queryTextContent } from '@app/utils';

import { SiteUpdatesPageComponent } from './site-updates-page.component';
import { SITE_UPDATES_RELEASES } from './site-updates.generated';

describe('SiteUpdatesPageComponent', () => {
  let fixture: ComponentFixture<SiteUpdatesPageComponent>;
  let component: SiteUpdatesPageComponent;
  let markLatestReleaseSeenSpy: Mock;

  beforeEach(async () => {
    markLatestReleaseSeenSpy = vi.fn();

    await TestBed.configureTestingModule({
      imports: [SiteUpdatesPageComponent],
      providers: [
        {
          provide: MetaAndTitleService,
          useValue: { updateTitle: vi.fn(), updateDescription: vi.fn() },
        },
        {
          provide: SiteUpdatesService,
          useValue: {
            releases: SITE_UPDATES_RELEASES,
            markLatestReleaseSeen: markLatestReleaseSeenSpy,
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SiteUpdatesPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render one card per release', () => {
    expect(queryAll(fixture.debugElement, '.release-card').length).toBe(
      SITE_UPDATES_RELEASES.length,
    );
  });

  it('should render the version without the v prefix', () => {
    const firstVersion = SITE_UPDATES_RELEASES[0].version.replace(/^v/, '');

    expect(queryTextContent(fixture.debugElement, '.release-version')).toBe(
      `Version ${firstVersion}`,
    );
  });

  it('should show an in-development badge instead of a release link for undated releases', () => {
    const undatedIndex = SITE_UPDATES_RELEASES.findIndex(release => !release.date);

    if (undatedIndex === -1) {
      return;
    }

    const card = queryAll(fixture.debugElement, '.release-card')[undatedIndex];
    expect(queryTextContent(card, 'ea-badge')).toBe('In development');
    expect(queryAll(card, '.release-link').length).toBe(0);
  });

  it('should link dated releases to their GitHub release', () => {
    const datedIndex = SITE_UPDATES_RELEASES.findIndex(release => release.date);

    if (datedIndex === -1) {
      return;
    }

    const card = queryAll(fixture.debugElement, '.release-card')[datedIndex];
    const link = queryAll(card, '.release-link')[0];
    expect(link.attributes['href']).toBe(
      `https://github.com/mwiraszka/london-chess/releases/tag/${SITE_UPDATES_RELEASES[datedIndex].version}`,
    );
  });

  it('should only render sections that have entries', () => {
    const firstRelease = SITE_UPDATES_RELEASES[0];
    const expectedSectionCount = [
      firstRelease.added,
      firstRelease.changed,
      firstRelease.fixed,
    ].filter(entries => entries.length > 0).length;

    const firstCard = queryAll(fixture.debugElement, '.release-card')[0];
    expect(queryAll(firstCard, '.release-section').length).toBe(expectedSectionCount);
  });

  it('should mark the latest release as seen on init', () => {
    expect(markLatestReleaseSeenSpy).toHaveBeenCalledTimes(1);
  });
});
