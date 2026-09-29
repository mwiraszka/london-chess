import {
  BookmarkIconComponent,
  ButtonComponent,
  EditIconComponent,
  PopoverComponent,
  PopoverPlacement,
  TooltipDirective,
  TrashIconComponent,
} from '@eagami/ui';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';

import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  computed,
  inject,
  input,
  output,
} from '@angular/core';
import { RouterLink } from '@angular/router';

import { AdminControlsConfig, AdminControlsPlacement } from '@app/models';
import { IsDefinedPipe, RouterLinkPipe } from '@app/pipes';
import { KeyStateService } from '@app/services';
import { isTouchDevice } from '@app/utils';

@UntilDestroy()
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
export class AdminControlsComponent implements OnInit {
  private readonly changeDetectorRef = inject(ChangeDetectorRef);
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

  public isTouchDevice = isTouchDevice();
  public showDeleteButton!: boolean;

  public ngOnInit(): void {
    if (this.isTouchDevice) {
      this.showDeleteButton = true;
    } else {
      this.keyStateService.ctrlMetaKeyPressed$
        .pipe(untilDestroyed(this))
        .subscribe(isPressed => {
          this.showDeleteButton = isPressed;
          // Renderer-based global listeners run outside Angular change detection;
          // explicitly mark for check so OnPush view updates when key pressed AFTER opening.
          this.changeDetectorRef.markForCheck();
        });
    }
  }
}
