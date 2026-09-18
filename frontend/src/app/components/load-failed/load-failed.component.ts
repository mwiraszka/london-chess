import { ButtonComponent, CloudOffIconComponent, EmptyStateComponent } from '@eagami/ui';

import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'lcc-load-failed',
  template: `
    <ea-empty-state
      description="Please check your connection and try again."
      headingLevel="h3"
      size="sm"
      [icon]="icon"
      [title]="title()">
      <ea-button
        slot="actions"
        size="sm"
        variant="secondary"
        (clicked)="retry.emit()">
        Try again
      </ea-button>
    </ea-empty-state>
  `,
  styleUrl: './load-failed.component.scss',
  imports: [ButtonComponent, EmptyStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoadFailedComponent {
  readonly title = input.required<string>();

  readonly retry = output<void>();

  protected readonly icon = CloudOffIconComponent;
}
