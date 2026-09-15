import { UsersIconComponent } from '@eagami/ui';

import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';

import { ClubCardComponent } from '@app/components/club-card/club-card.component';
import { PageHeaderComponent } from '@app/components/page-header/page-header.component';
import { REGIONAL_CLUBS } from '@app/constants/clubs';
import { MetaAndTitleService } from '@app/services';

@Component({
  selector: 'lcc-regional-clubs-page',
  template: `
    <lcc-page-header
      heading="Regional Clubs"
      [icon]="pageIcon">
    </lcc-page-header>

    <div class="club-cards-container">
      @for (club of REGIONAL_CLUBS; track club.name) {
        <lcc-club-card [club]="club"></lcc-club-card>
      }
    </div>
  `,
  styleUrl: './regional-clubs-page.component.scss',
  imports: [ClubCardComponent, PageHeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegionalClubsPageComponent implements OnInit {
  protected readonly pageIcon = UsersIconComponent;

  public readonly REGIONAL_CLUBS = REGIONAL_CLUBS;

  constructor(private readonly metaAndTitleService: MetaAndTitleService) {}

  public ngOnInit(): void {
    this.metaAndTitleService.updateTitle('Regional Clubs');
    this.metaAndTitleService.updateDescription(
      'Discover other chess clubs in the region.',
    );
  }
}
