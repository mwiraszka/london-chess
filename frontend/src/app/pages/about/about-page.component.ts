import {
  CalendarDaysIconComponent,
  InfoIconComponent,
  MapIconComponent,
} from '@eagami/ui';

import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ClubCardComponent } from '@app/components/club-card/club-card.component';
import { ExpansionPanelComponent } from '@app/components/expansion-panel/expansion-panel.component';
import { LinkListComponent } from '@app/components/link-list/link-list.component';
import { MemberLinkComponent } from '@app/components/member-link/member-link.component';
import { PageHeaderComponent } from '@app/components/page-header/page-header.component';
import { LCC } from '@app/constants/clubs';
import { Club, InternalLink } from '@app/models';
import { MetaAndTitleService } from '@app/services';

@Component({
  selector: 'lcc-about-page',
  templateUrl: './about-page.component.html',
  styleUrl: './about-page.component.scss',
  imports: [
    ClubCardComponent,
    ExpansionPanelComponent,
    LinkListComponent,
    MemberLinkComponent,
    PageHeaderComponent,
    RouterLink,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AboutPageComponent implements OnInit {
  private readonly metaAndTitleService = inject(MetaAndTitleService);

  protected readonly pageIcon = InfoIconComponent;

  public readonly lccClub: Club = LCC;
  public readonly schedulePageLink: InternalLink = {
    text: 'Scheduled events',
    internalPath: 'schedule',
    icon: CalendarDaysIconComponent,
  };
  public readonly regionalClubsPageLink: InternalLink = {
    text: 'More chess clubs in the region',
    internalPath: 'regional-clubs',
    icon: MapIconComponent,
  };

  public ngOnInit(): void {
    this.metaAndTitleService.updateTitle('About');
    this.metaAndTitleService.updateDescription(
      'A brief overview of the London Chess Club.',
    );
  }
}
