import { AwardIconComponent } from '@eagami/ui';

import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { PageHeaderComponent } from '@app/components/page-header/page-header.component';
import { KebabCasePipe } from '@app/pipes';
import { MemberProfilesService, MetaAndTitleService } from '@app/services';

@Component({
  selector: 'lcc-lifetime-page',
  templateUrl: './lifetime-page.component.html',
  styleUrl: './lifetime-page.component.scss',
  imports: [CommonModule, KebabCasePipe, PageHeaderComponent, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LifetimePageComponent implements OnInit {
  private readonly metaAndTitleService = inject(MetaAndTitleService);

  protected readonly memberProfiles = inject(MemberProfilesService);
  protected readonly pageIcon = AwardIconComponent;

  public readonly IMAGE_PATH = 'assets/lifetime-achievement-awards/';
  public readonly RECIPIENTS_MAP = new Map<number, string[]>([
    [2025, ['Hans Jung', 'Todd Southam', 'John Zoccano']],
    [2024, ['Don Armstrong', 'David Jackson', 'Steve Killi', 'Jay Zendrowski']],
    [2023, ['Steve Demmery', 'Jim Kearley', 'Gerry Litchfield']],
  ]);
  public readonly RECIPIENT_MEMBER_NUMBERS = new Map<string, number>([
    ['Gerry Litchfield', 2],
  ]);

  public ngOnInit(): void {
    void this.memberProfiles.load();
    this.metaAndTitleService.updateTitle('Lifetime');
    this.metaAndTitleService.updateDescription(
      'Lifetime Achievement Awards at the London Chess Club.',
    );
  }

  public originalOrder = () => 0;
}
