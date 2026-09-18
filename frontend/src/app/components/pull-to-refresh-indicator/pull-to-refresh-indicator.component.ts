import { RefreshCwIconComponent, SpinnerComponent } from '@eagami/ui';

import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { RefreshService } from '@app/services';

@Component({
  selector: 'lcc-pull-to-refresh-indicator',
  template: `
    @if (refreshService.isRefreshing()) {
      <ea-spinner
        class="indicator"
        label="Refreshing"
        size="sm" />
    } @else if (refreshService.pullProgress() > 0) {
      <ea-icon-refresh-cw
        class="indicator"
        aria-hidden="true" />
    }
  `,
  styleUrl: './pull-to-refresh-indicator.component.scss',
  imports: [RefreshCwIconComponent, SpinnerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.refreshing]': 'refreshService.isRefreshing()',
    '[style.--lcc-pull-progress]': 'refreshService.pullProgress()',
  },
})
export class PullToRefreshIndicatorComponent {
  protected readonly refreshService = inject(RefreshService);
}
