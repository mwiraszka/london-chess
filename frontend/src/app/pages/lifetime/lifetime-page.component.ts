import { AwardIconComponent, CardComponent } from '@eagami/ui';

import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { PageHeaderComponent } from '@app/components/page-header/page-header.component';
import { KebabCasePipe } from '@app/pipes';
import { MemberProfilesService, MetaAndTitleService } from '@app/services';

@Component({
  selector: 'lcc-lifetime-page',
  templateUrl: './lifetime-page.component.html',
  styleUrl: './lifetime-page.component.scss',
  imports: [
    CardComponent,
    KebabCasePipe,
    NgTemplateOutlet,
    PageHeaderComponent,
    RouterLink,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'lcc-page--reading' },
})
export class LifetimePageComponent implements OnInit {
  private readonly metaAndTitleService = inject(MetaAndTitleService);

  protected readonly memberProfiles = inject(MemberProfilesService);
  protected readonly pageIcon = AwardIconComponent;

  public readonly IMAGE_PATH = 'assets/lifetime-achievement-awards/';
  public readonly RECIPIENTS: { year: number; names: string[] }[] = [
    { year: 2025, names: ['Hans Jung', 'Todd Southam', 'John Zoccano'] },
    {
      year: 2024,
      names: ['Don Armstrong', 'David Jackson', 'Steve Killi', 'Jay Zendrowski'],
    },
    { year: 2023, names: ['Steve Demmery', 'Jim Kearley', 'Gerry Litchfield'] },
  ];
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
}
