import { NgComponentOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  TemplateRef,
  Type,
  input,
  output,
  viewChild,
} from '@angular/core';

import { TooltipDirective } from '@app/directives/tooltip.directive';
import { generateUuid } from '@app/utils/common/generate-uuid.util';

@Component({
  selector: 'lcc-toggle-switch',
  template: `
    @if (switchedOn() && iconWhenOn(); as icon) {
      <span class="toggle-icon">
        <ng-container *ngComponentOutlet="icon" />
      </span>
    } @else if (!switchedOn() && iconWhenOff(); as icon) {
      <span
        class="toggle-icon"
        [class.warning]="warningWhenOff()"
        [tooltip]="iconTooltipWhenOff()">
        <ng-container *ngComponentOutlet="icon" />
      </span>
    }

    <label
      #switchTooltip
      class="toggle-switch"
      [for]="uniqueId"
      [tooltip]="switchedOn() ? tooltipWhenOn() : tooltipWhenOff()">
      <input
        type="checkbox"
        [id]="uniqueId"
        [checked]="switchedOn()"
        (change)="onToggleChange()" />
      <div
        class="slider round"
        [class.warning]="!switchedOn() && warningWhenOff()">
      </div>
    </label>
  `,
  styleUrl: './toggle-switch.component.scss',
  imports: [NgComponentOutlet, TooltipDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToggleSwitchComponent {
  public readonly switchedOn = input.required<boolean>();

  public readonly iconTooltipWhenOff = input<string | TemplateRef<unknown> | null>(null);
  public readonly iconWhenOff = input<Type<unknown>>();
  public readonly iconWhenOn = input<Type<unknown>>();
  public readonly tooltipWhenOff = input<string | TemplateRef<unknown> | null>(null);
  public readonly tooltipWhenOn = input<string | TemplateRef<unknown> | null>(null);
  public readonly warningWhenOff = input(false);

  public readonly toggle = output<boolean>();

  private readonly tooltipDirective = viewChild('switchTooltip', {
    read: TooltipDirective,
  });

  public readonly uniqueId = generateUuid().slice(-8);

  public onToggleChange(): void {
    this.toggle.emit(!this.switchedOn());

    const tooltipDirective = this.tooltipDirective();
    if (tooltipDirective) {
      tooltipDirective.detach();
      setTimeout(() => this.tooltipDirective()?.attach());
    }
  }
}
