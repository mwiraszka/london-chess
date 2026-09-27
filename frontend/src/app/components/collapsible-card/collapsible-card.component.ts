import { CardComponent, ChevronDownIconComponent } from '@eagami/ui';

import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';

import { generateUuid } from '@app/utils';

/**
 * A full-width card whose whole header surface expands and collapses its content.
 */
@Component({
  selector: 'lcc-collapsible-card',
  templateUrl: './collapsible-card.component.html',
  styleUrl: './collapsible-card.component.scss',
  imports: [CardComponent, ChevronDownIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CollapsibleCardComponent {
  public readonly heading = input.required<string>();
  public readonly expanded = model(true);

  protected readonly bodyId = `collapsible-card-${generateUuid().slice(-8)}`;

  protected onToggle(): void {
    this.expanded.update(expanded => !expanded);
  }
}
