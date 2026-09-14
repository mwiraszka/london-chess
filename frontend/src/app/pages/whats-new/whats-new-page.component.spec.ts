import { provideMockStore } from '@ngrx/store/testing';

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MetaAndTitleService, WhatsChangedService } from '@app/services';
import { initialState as membersInitialState } from '@app/store/members/members.reducer';
import { queryAll, queryTextContent } from '@app/utils';

import packageJson from '../../../../package.json';
import { WHATS_CHANGED_RELEASES } from './whats-changed.generated';
import { WhatsNewPageComponent } from './whats-new-page.component';

describe('WhatsNewPageComponent', () => {
  let fixture: ComponentFixture<WhatsNewPageComponent>;
  let component: WhatsNewPageComponent;
  let markLatestReleaseSeenSpy: Mock;

  beforeEach(async () => {
    markLatestReleaseSeenSpy = vi.fn();

    await TestBed.configureTestingModule({
      imports: [WhatsNewPageComponent],
      providers: [
        {
          provide: MetaAndTitleService,
          useValue: { updateTitle: vi.fn(), updateDescription: vi.fn() },
        },
        {
          provide: WhatsChangedService,
          useValue: {
            releases: WHATS_CHANGED_RELEASES,
            markLatestReleaseSeen: markLatestReleaseSeenSpy,
          },
        },
        provideMockStore({ initialState: { membersState: membersInitialState } }),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(WhatsNewPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render one card per release', () => {
    expect(queryAll(fixture.debugElement, '.release-card').length).toBe(
      WHATS_CHANGED_RELEASES.length,
    );
  });

  it('should render the version without the v prefix', () => {
    const firstVersion = WHATS_CHANGED_RELEASES[0].version.replace(/^v/, '');

    expect(queryTextContent(fixture.debugElement, '.release-version')).toBe(
      `Version ${firstVersion}`,
    );
  });

  it('should show an in-development badge instead of a release link for undated releases', () => {
    const undatedIndex = WHATS_CHANGED_RELEASES.findIndex(release => !release.date);

    if (undatedIndex === -1) {
      return;
    }

    const card = queryAll(fixture.debugElement, '.release-card')[undatedIndex];
    expect(queryTextContent(card, 'ea-badge')).toBe('In development');
    expect(queryAll(card, '.release-link').length).toBe(0);
  });

  it('should link dated releases to their GitHub release', () => {
    const datedIndex = WHATS_CHANGED_RELEASES.findIndex(release => release.date);

    if (datedIndex === -1) {
      return;
    }

    const card = queryAll(fixture.debugElement, '.release-card')[datedIndex];
    const link = queryAll(card, '.release-link')[0];
    expect(link.attributes['href']).toBe(
      `https://github.com/mwiraszka/london-chess/releases/tag/${WHATS_CHANGED_RELEASES[datedIndex].version}`,
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
      WHATS_CHANGED_RELEASES.length,
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
    const firstRelease = WHATS_CHANGED_RELEASES[0];
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
      WHATS_CHANGED_RELEASES.length,
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

  it('should mark the latest release as seen on init', () => {
    expect(markLatestReleaseSeenSpy).toHaveBeenCalledTimes(1);
  });
});
