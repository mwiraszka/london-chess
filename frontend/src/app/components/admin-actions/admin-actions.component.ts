import {
  ButtonComponent,
  MenuComponent,
  MenuItemComponent,
  MenuTriggerDirective,
  ShieldCheckIconComponent,
  TooltipDirective,
} from '@eagami/ui';
import { Store } from '@ngrx/store';

import { NgComponentOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';

import { AdminAction, InternalLink } from '@app/models';
import { RouterLinkPipe } from '@app/pipes';
import { AdminActionsService } from '@app/services';
import { AuthSelectors } from '@app/store/auth';

/**
 * The admin's way into whatever the views on screen let them add or export: one
 * button fixed over the page, so showing it moves nothing, opening a menu of
 * those views' actions.
 */
@Component({
  selector: 'lcc-admin-actions',
  template: `
    @if (isAdmin() && actions().length) {
      <ea-button
        class="admin-actions-button"
        aria-label="Admin actions"
        size="lg"
        eaTooltip="Admin actions"
        [eaMenuTrigger]="menu"
        [icon]="shieldIcon" />
      <ea-menu
        #menu
        aria-label="Admin actions"
        placement="top-end">
        @for (action of actions(); track $index) {
          @if (isLink(action)) {
            <ea-menu-item (clicked)="onNavigate(action)">
              @if (action.icon) {
                <span slot="icon">
                  <ng-container *ngComponentOutlet="action.icon" />
                </span>
              }
              {{ action.text }}
            </ea-menu-item>
          } @else {
            <ea-menu-item
              [disabled]="action.isLoading?.() ?? false"
              (clicked)="action.action()">
              <span slot="icon">
                <ng-container *ngComponentOutlet="action.icon" />
              </span>
              {{ action.tooltip }}
            </ea-menu-item>
          }
        }
      </ea-menu>
    }
  `,
  styleUrl: './admin-actions.component.scss',
  imports: [
    ButtonComponent,
    MenuComponent,
    MenuItemComponent,
    MenuTriggerDirective,
    NgComponentOutlet,
    TooltipDirective,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminActionsComponent {
  private readonly router = inject(Router);
  private readonly routerLink = new RouterLinkPipe();

  protected readonly actions = inject(AdminActionsService).actions;
  protected readonly isAdmin = toSignal(
    inject(Store).select(AuthSelectors.selectIsAdmin),
    {
      initialValue: false,
    },
  );
  protected readonly shieldIcon = ShieldCheckIconComponent;

  protected isLink(action: AdminAction): action is InternalLink {
    return 'internalPath' in action;
  }

  protected onNavigate(link: InternalLink): void {
    void this.router.navigate([this.routerLink.transform(link.internalPath)], {
      queryParams: link.queryParams,
    });
  }
}
