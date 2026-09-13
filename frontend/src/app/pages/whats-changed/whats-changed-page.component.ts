import {
  BugIconComponent,
  CardComponent,
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

import { NgComponentOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, Type, inject } from '@angular/core';

import { PageHeaderComponent } from '@app/components/page-header/page-header.component';
import { WhatsChangedRelease } from '@app/models';
import { FormatDatePipe } from '@app/pipes';
import { MetaAndTitleService, WhatsChangedService } from '@app/services';

interface ReleaseSection {
  label: string;
  icon: Type<unknown>;
  entries: string[];
}

@Component({
  selector: 'lcc-whats-changed-page',
  templateUrl: './whats-changed-page.component.html',
  styleUrl: './whats-changed-page.component.scss',
  imports: [
    CardComponent,
    DividerComponent,
    BugIconComponent,
    CoffeeIconComponent,
    ExternalLinkIconComponent,
    GithubIconComponent,
    FormatDatePipe,
    NgComponentOutlet,
    PageHeaderComponent,
    TagComponent,
    TagIconComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WhatsChangedPageComponent implements OnInit {
  private readonly metaAndTitleService = inject(MetaAndTitleService);
  private readonly whatsChangedService = inject(WhatsChangedService);

  protected readonly pageIcon = LaptopIconComponent;
  protected readonly releases = this.whatsChangedService.releases;

  public ngOnInit(): void {
    this.metaAndTitleService.updateTitle("What's Changed");
    this.metaAndTitleService.updateDescription(
      'The latest improvements and features on the London Chess Club website.',
    );
    this.whatsChangedService.markLatestReleaseSeen();
  }

  protected displayVersion(release: WhatsChangedRelease): string {
    return release.version.replace(/^v/, '');
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
