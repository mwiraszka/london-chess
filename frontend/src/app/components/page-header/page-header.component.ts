import { ShieldCheckIconComponent } from '@eagami/ui';

import { NgComponentOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, Type, input } from '@angular/core';

import { TextSkeletonComponent } from '@app/components/text-skeleton/text-skeleton.component';

@Component({
  selector: 'lcc-page-header',
  template: `
    @if (icon()) {
      <span
        class="page-header-icon"
        [class.admin-page]="icon() === adminIcon">
        <ng-container *ngComponentOutlet="icon()" />
      </span>
    }
    <h2
      class="page-heading"
      [class.end-with-asterisk]="hasUnsavedChanges()">
      @if (heading() === null) {
        <lcc-text-skeleton width="14em" />
      } @else {
        {{ heading() }}
      }
    </h2>
  `,
  styleUrl: './page-header.component.scss',
  imports: [NgComponentOutlet, TextSkeletonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageHeaderComponent {
  // Null until the heading is known, meanwhile a placeholder holds its space
  public readonly heading = input.required<string | null>();

  public readonly hasUnsavedChanges = input<boolean | null>(null);
  public readonly icon = input<Type<unknown> | null>(null);

  protected readonly adminIcon = ShieldCheckIconComponent;
}
