import { HelpCircleIconComponent } from '@eagami/ui';

import { NgComponentOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  TemplateRef,
  Type,
  computed,
  input,
} from '@angular/core';

import { TooltipDirective } from '@app/directives/tooltip.directive';

/**
 * A field label with a trailing help icon. The icon is glued to the label's
 * final word in a no-wrap unit, so it can never wrap onto a line of its own.
 */
@Component({
  selector: 'lcc-field-label-with-help',
  template: `
    <label
      class="field-label"
      [attr.for]="forId() ?? null">
      @if (icon(); as leadingIcon) {
        <span
          class="field-label__icon"
          aria-hidden="true">
          <ng-container *ngComponentOutlet="leadingIcon" />
        </span>
      }
      <span>{{ leadingWithSpace() }}</span>
      <span class="field-label__tail">
        <span>{{ lastWord() }}</span>
        <ea-icon-help-circle
          class="field-label__help"
          [tooltip]="helpTooltip()" />
      </span>
    </label>
  `,
  styles: `
    :host {
      display: block;
    }

    .field-label {
      display: block;

      // The app styles bare spans with their own line-height; the label line
      // box must stay on the shared label metric to align with ea-input labels
      span {
        line-height: inherit;
      }
      font-size: max(var(--text-label-md-size), 0.75rem);
      font-weight: var(--text-label-md-weight);
      line-height: var(--text-label-md-lh);
      color: var(--color-text-primary);
    }

    .field-label__icon {
      display: inline-flex;
      vertical-align: -0.125em;
      margin-right: 5px;
      font-size: 1em;

      // The lichess mark fills its box edge to edge, so it reads tighter than
      // the other logos at the same margin
      &:has(lcc-lichess-logo) {
        margin-right: 6px;
      }
    }

    // The icon is out of flow with its space reserved, so it can neither
    // wrap on its own nor stretch the label line box out of alignment
    .field-label__tail {
      position: relative;
      white-space: nowrap;
      padding-right: 20px;
    }

    .field-label__help {
      position: absolute;
      top: 50%;
      right: 0;
      display: inline-flex;
      font-size: 14px;
      color: var(--color-text-secondary);
      cursor: help;
      transform: translateY(-50%);
    }
  `,
  imports: [HelpCircleIconComponent, NgComponentOutlet, TooltipDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FieldLabelWithHelpComponent {
  readonly text = input.required<string>();
  readonly forId = input<string | undefined>(undefined);
  readonly icon = input<Type<unknown> | undefined>(undefined);
  readonly helpTooltip = input.required<TemplateRef<unknown> | string>();

  // The final word travels with the help icon; everything before it may wrap.
  // The trailing space inside the interpolation survives template whitespace
  // stripping and gives the browser its soft-wrap point.
  protected readonly leadingWithSpace = computed(() => {
    const words = this.text().trim().split(/\s+/);
    const leading = words.slice(0, -1).join(' ');
    return leading ? `${leading} ` : '';
  });

  protected readonly lastWord = computed(() => {
    const words = this.text().trim().split(/\s+/);
    return words.at(-1) ?? '';
  });
}
