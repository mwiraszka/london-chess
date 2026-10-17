import {
  ButtonComponent,
  DividerComponent,
  MenuComponent,
  MenuItemComponent,
  MenuTriggerDirective,
  ShieldCheckIconComponent,
  TooltipDirective,
} from '@eagami/ui';
import { Store } from '@ngrx/store';

import { NgComponentOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';

import { ADMIN_ACTION_GROUPS } from '@app/constants/admin-actions';
import { AdminAction } from '@app/models';
import { RouterLinkPipe } from '@app/pipes';
import { AdminActionsService } from '@app/services';
import { AuthSelectors } from '@app/store/auth';

/**
 * The admin's way into whatever the views on screen let them add, export or manage: one
 * button fixed over the page, so showing it moves nothing, opening a menu of those
 * views' actions with like actions grouped together.
 */
@Component({
  selector: 'lcc-admin-actions',
  template: `
    @if (isAdmin() && groups().length) {
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
        @for (group of groups(); track group[0].group) {
          @if (!$first) {
            <ea-divider class="menu-divider" />
          }
          @for (action of group; track action.label) {
            <ea-menu-item
              [disabled]="action.isLoading?.() ?? false"
              [variant]="action.group === 'delete' ? 'danger' : 'default'"
              (clicked)="onSelect(action)">
              <ng-container ngProjectAs="[slot=icon]">
                <ng-container *ngComponentOutlet="action.icon" />
              </ng-container>
              {{ action.label }}
            </ea-menu-item>
          }
        }
      </ea-menu>
    }
  `,
  styleUrl: './admin-actions.component.scss',
  imports: [
    ButtonComponent,
    DividerComponent,
    MenuComponent,
    MenuItemComponent,
    MenuTriggerDirective,
    NgComponentOutlet,
    TooltipDirective,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminActionsComponent {
  private readonly actions = inject(AdminActionsService).actions;
  private readonly router = inject(Router);
  private readonly routerLink = new RouterLinkPipe();

  protected readonly groups = computed(() =>
    ADMIN_ACTION_GROUPS.map(group =>
      this.actions().filter(action => action.group === group),
    ).filter(actions => actions.length > 0),
  );
  protected readonly isAdmin = toSignal(
    inject(Store).select(AuthSelectors.selectIsAdmin),
    {
      initialValue: false,
    },
  );
  protected readonly shieldIcon = ShieldCheckIconComponent;

  protected onSelect(action: AdminAction): void {
    if (action.run) {
      action.run();
    } else {
      void this.router.navigate([this.routerLink.transform(action.path)]);
    }
  }
}
