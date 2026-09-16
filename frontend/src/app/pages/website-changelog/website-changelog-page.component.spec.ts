import { provideMockStore } from '@ngrx/store/testing';
import { BehaviorSubject } from 'rxjs';

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';

import { ChangelogService, MetaAndTitleService, RoutingService } from '@app/services';
import { initialState as membersInitialState } from '@app/store/members/members.reducer';
import { queryAll, queryTextContent } from '@app/utils';

import packageJson from '../../../../package.json';
import { CHANGELOG_RELEASES } from './changelog.generated';
import { WebsiteChangelogPageComponent } from './website-changelog-page.component';

describe('WebsiteChangelogPageComponent', () => {
  let fixture: ComponentFixture<WebsiteChangelogPageComponent>;
  let component: WebsiteChangelogPageComponent;
  let markLatestReleaseSeenSpy: Mock;
  let fragment$: BehaviorSubject<string | null>;

  beforeEach(async () => {
    markLatestReleaseSeenSpy = vi.fn();
    fragment$ = new BehaviorSubject<string | null>(null);

    await TestBed.configureTestingModule({
      imports: [WebsiteChangelogPageComponent],
      providers: [
        {
          provide: MetaAndTitleService,
          useValue: { updateTitle: vi.fn(), updateDescription: vi.fn() },
        },
        {
          provide: ChangelogService,
          useValue: {
            releases: CHANGELOG_RELEASES,
            markLatestReleaseSeen: markLatestReleaseSeenSpy,
          },
        },
        { provide: RoutingService, useValue: { fragment$ } },
        provideMockStore({ initialState: { membersState: membersInitialState } }),
      ],
    }).compileComponents();
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    fixture = TestBed.createComponent(WebsiteChangelogPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render one card per release', () => {
    expect(queryAll(fixture.debugElement, '.release-card').length).toBe(
      CHANGELOG_RELEASES.length,
    );
  });

  it('should render the version without the v prefix', () => {
    const firstVersion = CHANGELOG_RELEASES[0].version.replace(/^v/, '');

    expect(queryTextContent(fixture.debugElement, '.release-version')).toBe(
      `Version ${firstVersion}`,
    );
  });

  it('should show an in-development badge instead of a release link for undated releases', () => {
    const undatedIndex = CHANGELOG_RELEASES.findIndex(release => !release.date);

    if (undatedIndex === -1) {
      return;
    }

    const card = queryAll(fixture.debugElement, '.release-card')[undatedIndex];
    expect(queryTextContent(card, 'ea-badge')).toBe('In development');
    expect(queryAll(card, '.release-link').length).toBe(0);
  });

  it('should link dated releases to their GitHub release', () => {
    const datedIndex = CHANGELOG_RELEASES.findIndex(release => release.date);

    if (datedIndex === -1) {
      return;
    }

    const card = queryAll(fixture.debugElement, '.release-card')[datedIndex];
    const link = queryAll(card, '.release-link')[0];
    expect(link.attributes['href']).toBe(
      `https://github.com/mwiraszka/london-chess/releases/tag/${CHANGELOG_RELEASES[datedIndex].version}`,
    );
  });

  it('should badge only the release matching the running version as current', () => {
    const cards = queryAll(fixture.debugElement, '.release-card');
    const badged = cards.filter(card => queryAll(card, '.current-badge').length > 0);

    expect(badged.length).toBe(1);
    expect(queryTextContent(badged[0], '.release-version')).toBe(
      `Version ${packageJson.version}`,
    );
  });

  it('should collapse every release by default', () => {
    expect(queryAll(fixture.debugElement, '.release-section').length).toBe(0);
    expect(queryAll(fixture.debugElement, '.release-tags').length).toBe(
      CHANGELOG_RELEASES.length,
    );
  });

  it('should expand a release when its header is clicked', () => {
    const firstCard = queryAll(fixture.debugElement, '.release-card')[0];

    queryAll(firstCard, '.release-toggle')[0].nativeElement.click();
    fixture.detectChanges();

    expect(queryAll(firstCard, '.release-section').length).toBeGreaterThan(0);
  });

  it('should collapse an expanded release when its header is clicked again', () => {
    const firstCard = queryAll(fixture.debugElement, '.release-card')[0];
    const toggle = queryAll(firstCard, '.release-toggle')[0].nativeElement;

    toggle.click();
    fixture.detectChanges();
    toggle.click();
    fixture.detectChanges();

    expect(queryAll(firstCard, '.release-section').length).toBe(0);
  });

  it('should only render sections that have entries', () => {
    const firstRelease = CHANGELOG_RELEASES[0];
    const expectedSectionCount = [
      firstRelease.added,
      firstRelease.changed,
      firstRelease.fixed,
    ].filter(entries => entries.length > 0).length;
    const firstCard = queryAll(fixture.debugElement, '.release-card')[0];

    queryAll(firstCard, '.release-toggle')[0].nativeElement.click();
    fixture.detectChanges();

    expect(queryAll(firstCard, '.release-section').length).toBe(expectedSectionCount);
  });

  it('should render one quick find button per release', () => {
    expect(queryAll(fixture.debugElement, '.version-nav__item').length).toBe(
      CHANGELOG_RELEASES.length,
    );
  });

  it('should collapse the previous release when another quick find button is clicked', () => {
    const cards = queryAll(fixture.debugElement, '.release-card');
    const buttons = queryAll(fixture.debugElement, '.version-nav__item');

    buttons[0].nativeElement.click();
    fixture.detectChanges();
    buttons[1].nativeElement.click();
    fixture.detectChanges();

    expect(queryAll(cards[0], '.release-section').length).toBe(0);
    expect(queryAll(cards[1], '.release-section').length).toBeGreaterThan(0);
  });

  it('should expand a release when its quick find button is clicked', () => {
    const firstCard = queryAll(fixture.debugElement, '.release-card')[0];

    queryAll(fixture.debugElement, '.version-nav__item')[0].nativeElement.click();
    fixture.detectChanges();

    expect(queryAll(firstCard, '.release-section').length).toBeGreaterThan(0);
  });

  it('should give each release card its version as the id its fragment points to', () => {
    const ids = queryAll(fixture.debugElement, '.release-card').map(
      card => card.attributes['id'],
    );

    expect(ids).toEqual(CHANGELOG_RELEASES.map(release => release.version));
  });

  it('should expand the release named by the URL fragment', () => {
    const secondCard = queryAll(fixture.debugElement, '.release-card')[1];

    fragment$.next(CHANGELOG_RELEASES[1].version);
    fixture.detectChanges();

    expect(queryAll(secondCard, '.release-section').length).toBeGreaterThan(0);
  });

  it('should put the release in the URL fragment when its quick find button is clicked', () => {
    const router = TestBed.inject(Router);

    queryAll(fixture.debugElement, '.version-nav__item')[1].nativeElement.click();

    expect(router.navigate).toHaveBeenCalledWith([], {
      fragment: CHANGELOG_RELEASES[1].version,
      replaceUrl: true,
    });
  });

  it('should mark the latest release as seen on init', () => {
    expect(markLatestReleaseSeenSpy).toHaveBeenCalledTimes(1);
  });
});
