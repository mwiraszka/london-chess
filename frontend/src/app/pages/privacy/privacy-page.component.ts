import { CardComponent, LockIconComponent } from '@eagami/ui';

import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';

import { PageHeaderComponent } from '@app/components/page-header/page-header.component';
import { MetaAndTitleService } from '@app/services';

@Component({
  selector: 'lcc-privacy-page',
  templateUrl: './privacy-page.component.html',
  styleUrl: './privacy-page.component.scss',
  imports: [CardComponent, PageHeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'lcc-page--reading' },
})
export class PrivacyPageComponent implements OnInit {
  private readonly metaAndTitleService = inject(MetaAndTitleService);

  protected readonly pageIcon = LockIconComponent;

  public ngOnInit(): void {
    this.metaAndTitleService.updateTitle('Privacy');
    this.metaAndTitleService.updateDescription(
      'What the London Chess Club keeps about its members and visitors, who sees it, and how to have it removed.',
    );
  }
}
