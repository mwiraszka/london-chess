import {
  BadgeComponent,
  CardComponent,
  DividerComponent,
  ExternalLinkIconComponent,
  SparklesIconComponent,
  ToolIconComponent,
  TrendingUpIconComponent,
} from '@eagami/ui';

import { NgComponentOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, Type, inject } from '@angular/core';

import { PageHeaderComponent } from '@app/components/page-header/page-header.component';
import { SiteUpdatesRelease } from '@app/models';
import { FormatDatePipe } from '@app/pipes';
import { MetaAndTitleService, SiteUpdatesService } from '@app/services';

interface ReleaseSection {
  label: string;
  icon: Type<unknown>;
  entries: string[];
}

@Component({
  selector: 'lcc-site-updates-page',
  templateUrl: './site-updates-page.component.html',
  styleUrl: './site-updates-page.component.scss',
  imports: [
    BadgeComponent,
    CardComponent,
    DividerComponent,
    ExternalLinkIconComponent,
    FormatDatePipe,
    NgComponentOutlet,
    PageHeaderComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SiteUpdatesPageComponent implements OnInit {
  private readonly metaAndTitleService = inject(MetaAndTitleService);
  private readonly siteUpdatesService = inject(SiteUpdatesService);

  protected readonly pageIcon = SparklesIconComponent;
  protected readonly releases = this.siteUpdatesService.releases;

  public ngOnInit(): void {
    this.metaAndTitleService.updateTitle('Site Updates');
    this.metaAndTitleService.updateDescription(
      'The latest improvements and features on the London Chess Club website.',
    );
    this.siteUpdatesService.markLatestReleaseSeen();
  }

  protected displayVersion(release: SiteUpdatesRelease): string {
    return release.version.replace(/^v/, '');
  }

  protected releaseUrl(release: SiteUpdatesRelease): string {
    return `https://github.com/mwiraszka/london-chess/releases/tag/${release.version}`;
  }

  protected sectionsOf(release: SiteUpdatesRelease): ReleaseSection[] {
    const sections: ReleaseSection[] = [
      { label: 'New', icon: SparklesIconComponent, entries: release.added },
      { label: 'Improved', icon: TrendingUpIconComponent, entries: release.changed },
      { label: 'Fixed', icon: ToolIconComponent, entries: release.fixed },
    ];
    return sections.filter(section => section.entries.length > 0);
  }
}
