import { BookmarkIconComponent, EditIconComponent, TrashIconComponent } from '@eagami/ui';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';

import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  inject,
  output,
} from '@angular/core';
import { RouterLink } from '@angular/router';

import { TooltipDirective } from '@app/directives/tooltip.directive';
import { AdminControlsConfig } from '@app/models/admin-controls-config.model';
import { IsDefinedPipe, RouterLinkPipe } from '@app/pipes';
import { ADMIN_CONTROLS_CONFIG_TOKEN } from '@app/services';
import { KeyStateService } from '@app/services';
import { isTouchDevice } from '@app/utils';

@UntilDestroy()
@Component({
  selector: 'lcc-admin-controls',
  templateUrl: './admin-controls.component.html',
  styleUrl: './admin-controls.component.scss',
  imports: [
    BookmarkIconComponent,
    EditIconComponent,
    IsDefinedPipe,
    RouterLink,
    RouterLinkPipe,
    TooltipDirective,
    TrashIconComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminControlsComponent implements OnInit, OnDestroy {
  private readonly changeDetectorRef = inject(ChangeDetectorRef);
  private readonly elementRef = inject(ElementRef);
  private readonly keyStateService = inject(KeyStateService);

  public config = inject<AdminControlsConfig>(ADMIN_CONTROLS_CONFIG_TOKEN);

  public readonly destroyed = output<void>();

  public isTouchDevice = isTouchDevice();
  public showDeleteButton!: boolean;

  public ngOnInit(): void {
    this.elementRef.nativeElement.style.setProperty(
      '--admin-control-button-size',
      `${this.config.buttonSize}px`,
    );

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

  public ngOnDestroy(): void {
    this.destroyed.emit();
  }
}
