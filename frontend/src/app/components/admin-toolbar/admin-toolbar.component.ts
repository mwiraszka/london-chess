import { ShieldCheckIconComponent } from '@eagami/ui';

import { NgComponentOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

import { LinkListComponent } from '@app/components/link-list/link-list.component';
import { TooltipDirective } from '@app/directives/tooltip.directive';
import { AdminButton, ExternalLink, InternalLink } from '@app/models';

@Component({
  selector: 'lcc-admin-toolbar',
  template: `
    <ea-icon-shield-check class="admin-icon" />
    <div class="controls-container">
      @if (adminLinks) {
        <lcc-link-list [links]="adminLinks"></lcc-link-list>
      }
      @if (adminButtons) {
        <div class="admin-buttons">
          @for (button of adminButtons; track button.id) {
            <button
              [id]="button.id"
              class="admin-button lcc-secondary-button"
              type="button"
              [tooltip]="button.tooltip"
              (click)="button.action()">
              <span class="button-icon">
                <ng-container *ngComponentOutlet="button.icon" />
              </span>
            </button>
          }
        </div>
      }
    </div>
  `,
  styleUrl: './admin-toolbar.component.scss',
  imports: [
    LinkListComponent,
    NgComponentOutlet,
    ShieldCheckIconComponent,
    TooltipDirective,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminToolbarComponent {
  @Input() adminButtons?: AdminButton[];
  @Input() adminLinks?: Array<InternalLink | ExternalLink>;
}
