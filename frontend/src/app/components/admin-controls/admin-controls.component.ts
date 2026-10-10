import {
  BookmarkIconComponent,
  ButtonComponent,
  EditIconComponent,
  PopoverComponent,
  PopoverPlacement,
  TooltipDirective,
  TrashIconComponent,
} from '@eagami/ui';

import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';

import { AdminControlsConfig, AdminControlsPlacement } from '@app/models';
import { IsDefinedPipe, RouterLinkPipe } from '@app/pipes';
import { KeyStateService } from '@app/services';
import { IS_TOUCH_DEVICE } from '@app/tokens';

@Component({
  selector: 'lcc-admin-controls',
  templateUrl: './admin-controls.component.html',
  styleUrl: './admin-controls.component.scss',
  imports: [
    ButtonComponent,
    EditIconComponent,
    IsDefinedPipe,
    PopoverComponent,
    RouterLink,
    RouterLinkPipe,
    TooltipDirective,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminControlsComponent {
  private readonly keyStateService = inject(KeyStateService);

  public readonly anchor = input.required<HTMLElement>();
  public readonly config = input.required<AdminControlsConfig>();
  public readonly placement = input<AdminControlsPlacement>('top');

  public readonly closed = output<void>();

  protected readonly popoverPlacement = computed<PopoverPlacement>(() =>
    this.placement() === 'top' ? 'inside-top-start' : 'inside-start',
  );

  protected readonly bookmarkIcon = BookmarkIconComponent;
  protected readonly deleteIcon = TrashIconComponent;

  // A touch screen has no key to hold down, so deleting is always offered there
  protected readonly showDeleteButton = inject(IS_TOUCH_DEVICE)()
    ? signal(true).asReadonly()
    : toSignal(this.keyStateService.ctrlMetaKeyPressed$, { requireSync: true });
}
