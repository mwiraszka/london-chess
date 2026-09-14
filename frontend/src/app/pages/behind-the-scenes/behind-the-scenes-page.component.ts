import {
  BadgeComponent,
  BugIconComponent,
  CardComponent,
  ChevronDownIconComponent,
  CoffeeIconComponent,
  DividerComponent,
  ExternalLinkIconComponent,
  GithubIconComponent,
  LaptopIconComponent,
  SparklesIconComponent,
  TagComponent,
  TagIconComponent,
  ToolIconComponent,
  TrendingUpIconComponent,
} from '@eagami/ui';
import { Store } from '@ngrx/store';
import { take } from 'rxjs/operators';

import { NgComponentOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  Injector,
  OnInit,
  Type,
  afterNextRender,
  inject,
  signal,
} from '@angular/core';

import { MemberLinkComponent } from '@app/components/member-link/member-link.component';
import { PageHeaderComponent } from '@app/components/page-header/page-header.component';
import { TechRingComponent } from '@app/components/tech-ring/tech-ring.component';
import { WhatsChangedRelease } from '@app/models';
import { FormatDatePipe } from '@app/pipes';
import { MetaAndTitleService, WhatsChangedService } from '@app/services';
import { MembersActions, MembersSelectors } from '@app/store/members';
import { isExpired } from '@app/utils';

import packageJson from '../../../../package.json';

interface ReleaseSection {
  label: string;
  icon: Type<unknown>;
  entries: string[];
}

@Component({
  selector: 'lcc-behind-the-scenes-page',
  templateUrl: './behind-the-scenes-page.component.html',
  styleUrl: './behind-the-scenes-page.component.scss',
  imports: [
    BadgeComponent,
    BugIconComponent,
    CardComponent,
    ChevronDownIconComponent,
    CoffeeIconComponent,
    DividerComponent,
    ExternalLinkIconComponent,
    FormatDatePipe,
    GithubIconComponent,
    MemberLinkComponent,
    NgComponentOutlet,
    PageHeaderComponent,
    TagComponent,
    TagIconComponent,
    TechRingComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BehindTheScenesPageComponent implements OnInit {
  private readonly injector = inject(Injector);
  private readonly metaAndTitleService = inject(MetaAndTitleService);
  private readonly store = inject(Store);
  private readonly whatsChangedService = inject(WhatsChangedService);

  // The badge follows the version the site is actually running, so a version
  // bump moves it to that release's card on its own
  private readonly currentVersion = `v${packageJson.version}`;

  protected readonly pageIcon = LaptopIconComponent;
  protected readonly releases = this.whatsChangedService.releases;

  private readonly selectedVersion = signal<string | null>(null);

  public ngOnInit(): void {
    this.metaAndTitleService.updateTitle('Behind the Scenes');
    this.metaAndTitleService.updateDescription(
      'How the London Chess Club website is built, and what has changed in each release.',
    );
    this.whatsChangedService.markLatestReleaseSeen();

    // The maintainer's name links to their member profile, which needs the
    // members loaded
    this.store
      .select(MembersSelectors.selectLastFullFetch)
      .pipe(take(1))
      .subscribe(lastFullFetch => {
        if (isExpired(lastFullFetch)) {
          this.store.dispatch(MembersActions.fetchAllMembersRequested());
        }
      });
  }

  protected displayVersion(release: WhatsChangedRelease): string {
    return release.version.replace(/^v/, '');
  }

  protected releaseId(release: WhatsChangedRelease): string {
    return `release-${release.version}`;
  }

  protected isCurrent(release: WhatsChangedRelease): boolean {
    return release.version === this.currentVersion;
  }

  protected isExpanded(release: WhatsChangedRelease): boolean {
    return this.selectedVersion() === release.version;
  }

  protected onToggleRelease(release: WhatsChangedRelease): void {
    this.selectedVersion.update(selected =>
      selected === release.version ? null : release.version,
    );
  }

  protected onJumpToRelease(release: WhatsChangedRelease): void {
    this.selectedVersion.set(release.version);

    // Selecting collapses whichever release was open, so the card only lands at
    // its final offset once that has been rendered
    afterNextRender(
      () =>
        document
          .getElementById(this.releaseId(release))
          ?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
      { injector: this.injector },
    );
  }

  protected releaseUrl(release: WhatsChangedRelease): string {
    return `https://github.com/mwiraszka/london-chess/releases/tag/${release.version}`;
  }

  protected sectionsOf(release: WhatsChangedRelease): ReleaseSection[] {
    const sections: ReleaseSection[] = [
      { label: 'New', icon: SparklesIconComponent, entries: release.added },
      { label: 'Improved', icon: TrendingUpIconComponent, entries: release.changed },
      { label: 'Fixed', icon: ToolIconComponent, entries: release.fixed },
    ];
    return sections.filter(section => section.entries.length > 0);
  }
}
