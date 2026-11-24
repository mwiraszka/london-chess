import { map } from 'rxjs';

import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';

import { IsoDate } from '@app/models';
import { SECOND_TICKS, countdownParts, describeCountdown } from '@app/utils';

/**
 * The time left until an instant, ticking down to the second on tiles that hold their
 * width, read out in words.
 */
@Component({
  selector: 'lcc-countdown',
  templateUrl: './countdown.component.html',
  styleUrl: './countdown.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CountdownComponent {
  public readonly until = input.required<IsoDate>();

  // Every digit a place can show, laid over one another with only the current one
  // visible, so a place is as wide as its widest digit and nothing moves as it ticks
  protected readonly glyphs = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

  private readonly now = toSignal(SECOND_TICKS.pipe(map(() => Date.now())), {
    initialValue: Date.now(),
  });

  protected readonly parts = computed(() =>
    countdownParts(Date.parse(this.until()) - this.now()),
  );
  protected readonly description = computed(() => describeCountdown(this.parts()));
}
