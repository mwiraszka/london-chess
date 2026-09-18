import { SkeletonComponent } from '@eagami/ui';

import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'lcc-text-skeleton',
  template: `&nbsp;<ea-skeleton
      class="bar"
      variant="text"
      width="100%"
      height="100%" />`,
  styleUrl: './text-skeleton.component.scss',
  imports: [SkeletonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'aria-hidden': 'true',
    '[style.width]': 'width()',
  },
})
export class TextSkeletonComponent {
  readonly width = input.required<string>();
}
