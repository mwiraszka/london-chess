import { ShieldCheckIconComponent } from '@eagami/ui';

import { NgComponentOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input, Type } from '@angular/core';

import { TextSkeletonComponent } from '@app/components/text-skeleton/text-skeleton.component';

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
      @if (heading === null) {
        <lcc-text-skeleton width="14em" />
      } @else {
        {{ heading }}
      }
    </h2>
  `,
  styleUrl: './page-header.component.scss',
  imports: [NgComponentOutlet, TextSkeletonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageHeaderComponent {
  // Null until the heading is known, meanwhile a placeholder holds its space
  @Input({ required: true }) public heading!: string | null;

  @Input() public hasUnsavedChanges: boolean | null = null;
  @Input() public icon: Type<unknown> | null = null;

  protected readonly adminIcon = ShieldCheckIconComponent;
}
