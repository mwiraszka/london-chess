import {
  BookmarkIconComponent,
  EditIconComponent,
  MenuComponent,
  MenuItemComponent,
  TrashIconComponent,
} from '@eagami/ui';

import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  viewChild,
} from '@angular/core';
import { Router } from '@angular/router';

import { AdminControlsConfig } from '@app/models';
import { RouterLinkPipe } from '@app/pipes';
import { isAdminControlsConfig } from '@app/utils';

/**
 * One item's admin actions, as a context menu shared by every item in a view: each
 * item opens it with `[eaContextMenuTrigger]="adminMenu.menu()"` and hands over its
 * own actions as `[contextMenuData]`. A right-click, a long press or Shift+F10 opens it.
 */
@Component({
  selector: 'lcc-admin-menu',
  template: `
    <ea-menu
      size="sm"
      [aria-label]="label()">
      @if (controls(); as controls) {
        @if (controls.bookmarkCb && controls.bookmarked !== undefined) {
          <ea-menu-item
            class="bookmark-item"
            (clicked)="controls.bookmarkCb()">
            <ea-icon-bookmark slot="icon" />
            {{ controls.bookmarked ? 'Remove bookmark' : 'Bookmark' }}
          </ea-menu-item>
        }
        @if (controls.editPath) {
          <ea-menu-item
            class="edit-item"
            [disabled]="controls.isEditDisabled ?? false"
            (clicked)="onEdit(controls)">
            <ea-icon-edit slot="icon" />
            Edit
            @if (controls.isEditDisabled && controls.editDisabledReason) {
              <span class="reason">{{ controls.editDisabledReason }}</span>
            }
          </ea-menu-item>
        }
        <ea-menu-item
          class="delete-item"
          variant="danger"
          [disabled]="controls.isDeleteDisabled ?? false"
          (clicked)="controls.deleteCb()">
          <ea-icon-trash slot="icon" />
          Delete
          @if (controls.isDeleteDisabled && controls.deleteDisabledReason) {
            <span class="reason">{{ controls.deleteDisabledReason }}</span>
          }
        </ea-menu-item>
      }
    </ea-menu>
  `,
  styleUrl: './admin-menu.component.scss',
  imports: [
    BookmarkIconComponent,
    EditIconComponent,
    MenuComponent,
    MenuItemComponent,
    TrashIconComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminMenuComponent {
  private readonly router = inject(Router);
  private readonly routerLink = new RouterLinkPipe();

  // Not required: an item's trigger reads it before this view has rendered
  public readonly menu = viewChild(MenuComponent);

  protected readonly controls = computed(() => {
    const data = this.menu()?.triggerData();
    return isAdminControlsConfig(data) ? data : null;
  });

  protected readonly label = computed(() => {
    const itemName = this.controls()?.itemName;
    return itemName ? `Admin actions for ${itemName}` : 'Admin actions';
  });

  protected onEdit(controls: AdminControlsConfig): void {
    const url = this.routerLink.transform(controls.editPath);
    if (!url) {
      return;
    }
    if (controls.editInNewTab) {
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      void this.router.navigateByUrl(url);
    }
  }
}
