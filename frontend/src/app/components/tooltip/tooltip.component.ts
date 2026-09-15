import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  Inject,
  Optional,
  TemplateRef,
} from '@angular/core';

import {
  TOOLTIP_CONTENT_TOKEN,
  TOOLTIP_CONTEXT_TOKEN,
} from '@app/directives/tooltip.directive';
import { TruncateByCharsPipe } from '@app/pipes';
import { IsStringPipe } from '@app/pipes';

@Component({
  selector: 'lcc-tooltip',
  template: `
    @if (tooltipContent | isString) {
      <div class="lcc-truncate-max-5-lines">
        {{ tooltipContent | truncateByChars: 80 }}
      </div>
    } @else {
      <ng-template
        [ngTemplateOutlet]="tooltipContent"
        [ngTemplateOutletContext]="{ $implicit: tooltipContext }">
      </ng-template>
    }
  `,
  styleUrl: './tooltip.component.scss',
  imports: [CommonModule, IsStringPipe, TruncateByCharsPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TooltipComponent {
  constructor(
    @Inject(TOOLTIP_CONTENT_TOKEN) public tooltipContent: string | TemplateRef<unknown>,
    @Optional() @Inject(TOOLTIP_CONTEXT_TOKEN) public tooltipContext: unknown = null,
  ) {}
}
