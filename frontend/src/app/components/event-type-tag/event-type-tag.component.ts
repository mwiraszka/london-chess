import { TagComponent, TagSize, TrophyIconComponent } from '@eagami/ui';

import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { EVENT_TYPE_COLORS } from '@app/constants';
import { EventType } from '@app/models';
import { HighlightPipe } from '@app/pipes';

@Component({
  selector: 'lcc-event-type-tag',
  template: `
    <ea-tag
      tooltip="none"
      [color]="color()"
      [ink]="ink()"
      [size]="size()">
      <span
        [class.event-type--struck]="struck()"
        [innerHTML]="type() | highlight: search()">
      </span>
      @if (type() === 'championship') {
        <ea-icon-trophy
          class="championship-icon"
          aria-hidden="true" />
      }
    </ea-tag>
  `,
  styleUrl: './event-type-tag.component.scss',
  imports: [HighlightPipe, TagComponent, TrophyIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventTypeTagComponent {
  public readonly type = input.required<EventType>();
  public readonly ink = input('var(--color-text-primary)');
  public readonly search = input('');
  public readonly size = input<TagSize>('sm');
  // Crossed out with the rest of a line, such as an event about to be removed
  public readonly struck = input(false);

  protected readonly color = computed(() => EVENT_TYPE_COLORS[this.type()]);
}
