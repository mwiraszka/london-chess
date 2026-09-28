import { RefreshCwIconComponent } from '@eagami/ui';

import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { RefreshService } from '@app/services';

@Component({
  selector: 'lcc-pull-to-refresh-indicator',
  template: `
    @if (progress() > 0) {
      <div
        class="indicator"
        [class.indicator--refreshing]="refreshService.isRefreshing()">
        <ea-icon-refresh-cw
          class="indicator__icon"
          aria-hidden="true" />
      </div>
    }
  `,
  styleUrl: './pull-to-refresh-indicator.component.scss',
  imports: [RefreshCwIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[style.--lcc-pull-progress]': 'progress()',
  },
})
export class PullToRefreshIndicatorComponent {
  protected readonly refreshService = inject(RefreshService);

  // A released pull stays fully drawn until the refresh it set off is over
  protected readonly progress = computed(() =>
    this.refreshService.isRefreshing() ? 1 : this.refreshService.pullProgress(),
  );
}
