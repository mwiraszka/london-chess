import { RefreshCwIconComponent } from '@eagami/ui';

import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { RefreshService } from '@app/services';

@Component({
  selector: 'lcc-pull-to-refresh-indicator',
  template: `
    @if (refreshService.pullProgress() > 0) {
      <ea-icon-refresh-cw
        class="indicator"
        aria-hidden="true" />
    }
  `,
  styleUrl: './pull-to-refresh-indicator.component.scss',
  imports: [RefreshCwIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[style.--lcc-pull-progress]': 'refreshService.pullProgress()',
  },
})
export class PullToRefreshIndicatorComponent {
  protected readonly refreshService = inject(RefreshService);
}
