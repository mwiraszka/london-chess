import { InfoIconComponent } from '@eagami/ui';

import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ClubCardComponent } from '@app/components/club-card/club-card.component';
import { ExpansionPanelComponent } from '@app/components/expansion-panel/expansion-panel.component';
import { PageHeaderComponent } from '@app/components/page-header/page-header.component';
import { LCC } from '@app/constants/clubs';
import { Club } from '@app/models';
import { MetaAndTitleService } from '@app/services';

@Component({
  selector: 'lcc-about-page',
  templateUrl: './about-page.component.html',
  styleUrl: './about-page.component.scss',
  imports: [PageHeaderComponent, RouterLink, ClubCardComponent, ExpansionPanelComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AboutPageComponent implements OnInit {
  protected readonly pageIcon = InfoIconComponent;

  public readonly lccClub: Club = LCC;

  constructor(private readonly metaAndTitleService: MetaAndTitleService) {}

  public ngOnInit(): void {
    this.metaAndTitleService.updateTitle('About');
    this.metaAndTitleService.updateDescription(
      'A brief overview of the London Chess Club.',
    );
  }
}
