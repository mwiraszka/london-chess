import { ShieldCheckIconComponent, SpinnerComponent } from '@eagami/ui';

import { NgComponentOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { LinkListComponent } from '@app/components/link-list/link-list.component';
import { TooltipDirective } from '@app/directives/tooltip.directive';
import { AdminButton, ExternalLink, InternalLink } from '@app/models';

@Component({
  selector: 'lcc-admin-toolbar',
  template: `
    <ea-icon-shield-check class="admin-icon" />
    <div class="controls-container">
      @if (adminLinks(); as links) {
        <lcc-link-list [links]="links"></lcc-link-list>
      }
      @if (adminButtons(); as buttons) {
        <div class="admin-buttons">
          @for (button of buttons; track button.id) {
            <button
              [id]="button.id"
              class="admin-button lcc-secondary-button"
              type="button"
              [attr.aria-busy]="button.isLoading?.() ?? false"
              [disabled]="button.isLoading?.() ?? false"
              [tooltip]="button.tooltip"
              (click)="button.action()">
              <span class="button-icon">
                @if (button.isLoading?.()) {
                  <ea-spinner size="sm" />
                } @else {
                  <ng-container *ngComponentOutlet="button.icon" />
                }
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
    SpinnerComponent,
    TooltipDirective,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminToolbarComponent {
  public readonly adminButtons = input<AdminButton[]>();
  public readonly adminLinks = input<Array<InternalLink | ExternalLink>>();
}
