import { ShieldCheckIconComponent } from '@eagami/ui';

import { NgComponentOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input, Type } from '@angular/core';

@Component({
  selector: 'lcc-page-header',
  template: `
    @if (icon) {
      <span
        class="page-header-icon"
        [class.admin-page]="icon === adminIcon">
        <ng-container *ngComponentOutlet="icon" />
      </span>
    }
    <h2
      class="page-heading"
      [class.end-with-asterisk]="hasUnsavedChanges">
      {{ heading }}
    </h2>
  `,
  styleUrl: './page-header.component.scss',
  imports: [NgComponentOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageHeaderComponent {
  @Input({ required: true }) public heading!: string;

  @Input() public hasUnsavedChanges: boolean | null = null;
  @Input() public icon: Type<unknown> | null = null;

  protected readonly adminIcon = ShieldCheckIconComponent;
}
