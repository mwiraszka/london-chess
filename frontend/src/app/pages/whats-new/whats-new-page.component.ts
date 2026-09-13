import {
  BadgeComponent,
  CardComponent,
  DividerComponent,
  ExternalLinkIconComponent,
  PlusCircleIconComponent,
  SparklesIconComponent,
  ToolIconComponent,
  TrendingUpIconComponent,
} from '@eagami/ui';

import { NgComponentOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, Type, inject } from '@angular/core';

import { PageHeaderComponent } from '@app/components/page-header/page-header.component';
import { WhatsNewRelease } from '@app/models';
import { FormatDatePipe } from '@app/pipes';
import { MetaAndTitleService, WhatsNewService } from '@app/services';

interface ReleaseSection {
  label: string;
  icon: Type<unknown>;
  entries: string[];
}

@Component({
  selector: 'lcc-whats-new-page',
  templateUrl: './whats-new-page.component.html',
  styleUrl: './whats-new-page.component.scss',
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
export class WhatsNewPageComponent implements OnInit {
  private readonly metaAndTitleService = inject(MetaAndTitleService);
  private readonly whatsNewService = inject(WhatsNewService);

  protected readonly pageIcon = SparklesIconComponent;
  protected readonly releases = this.whatsNewService.releases;

  public ngOnInit(): void {
    this.metaAndTitleService.updateTitle("What's New");
    this.metaAndTitleService.updateDescription(
      'The latest improvements and features on the London Chess Club website.',
    );
    this.whatsNewService.markLatestReleaseSeen();
  }

  protected displayVersion(release: WhatsNewRelease): string {
    return release.version.replace(/^v/, '');
  }

  protected releaseUrl(release: WhatsNewRelease): string {
    return `https://github.com/mwiraszka/london-chess/releases/tag/${release.version}`;
  }

  protected sectionsOf(release: WhatsNewRelease): ReleaseSection[] {
    const sections: ReleaseSection[] = [
      { label: 'New', icon: PlusCircleIconComponent, entries: release.added },
      { label: 'Improved', icon: TrendingUpIconComponent, entries: release.changed },
      { label: 'Fixed', icon: ToolIconComponent, entries: release.fixed },
    ];
    return sections.filter(section => section.entries.length > 0);
  }
}
