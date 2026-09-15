import { NgComponentOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
  TemplateRef,
  Type,
  ViewChild,
} from '@angular/core';

import { TooltipDirective } from '@app/directives/tooltip.directive';
import { generateUuid } from '@app/utils/common/generate-uuid.util';

@Component({
  selector: 'lcc-toggle-switch',
  template: `
    @if (switchedOn && iconWhenOn) {
      <span class="toggle-icon">
        <ng-container *ngComponentOutlet="iconWhenOn" />
      </span>
    } @else if (!switchedOn && iconWhenOff) {
      <span
        class="toggle-icon"
        [class.warning]="warningWhenOff"
        [tooltip]="iconTooltipWhenOff">
        <ng-container *ngComponentOutlet="iconWhenOff" />
      </span>
    }

    <label
      #switchTooltip
      class="toggle-switch"
      [for]="uniqueId"
      [tooltip]="switchedOn ? tooltipWhenOn : tooltipWhenOff">
      <input
        type="checkbox"
        [id]="uniqueId"
        [checked]="switchedOn"
        (change)="onToggleChange()" />
      <div
        class="slider round"
        [class.warning]="!switchedOn && warningWhenOff">
      </div>
    </label>
  `,
  styleUrl: './toggle-switch.component.scss',
  imports: [NgComponentOutlet, TooltipDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToggleSwitchComponent implements OnInit {
  @Input({ required: true }) public switchedOn = false;

  @Input() public iconTooltipWhenOff: string | TemplateRef<unknown> | null = null;
  @Input() public iconWhenOff?: Type<unknown>;
  @Input() public iconWhenOn?: Type<unknown>;
  @Input() public tooltipWhenOff: string | TemplateRef<unknown> | null = null;
  @Input() public tooltipWhenOn: string | TemplateRef<unknown> | null = null;
  @Input() public warningWhenOff = false;

  @Output() public toggle = new EventEmitter<boolean>();

  @ViewChild('switchTooltip', { read: TooltipDirective, static: false })
  private tooltipDirective?: TooltipDirective;

  public uniqueId!: string;

  public ngOnInit(): void {
    this.uniqueId = generateUuid().slice(-8);
  }

  public onToggleChange(): void {
    this.toggle.emit();

    if (this.tooltipDirective) {
      this.tooltipDirective.detach();
      setTimeout(() => this.tooltipDirective?.attach());
    }
  }
}
