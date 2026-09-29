import { ButtonComponent, ShieldCheckIconComponent, TooltipDirective } from '@eagami/ui';

import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { LinkListComponent } from '@app/components/link-list/link-list.component';
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
          <ng-content />
          @for (button of buttons; track button.id) {
            <ea-button
              class="admin-button"
              variant="secondary"
              [id]="button.id"
              [aria-label]="button.tooltip"
              [eaTooltip]="button.tooltip"
              [icon]="button.icon"
              [loading]="button.isLoading?.() ?? false"
              (clicked)="button.action()" />
          }
        </div>
      }
    </div>
  `,
  styleUrl: './admin-toolbar.component.scss',
  imports: [
    ButtonComponent,
    LinkListComponent,
    ShieldCheckIconComponent,
    TooltipDirective,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminToolbarComponent {
  public readonly adminButtons = input<AdminButton[]>();
  public readonly adminLinks = input<Array<InternalLink | ExternalLink>>();
}
