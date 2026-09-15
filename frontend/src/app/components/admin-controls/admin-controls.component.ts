import { BookmarkIconComponent, EditIconComponent, TrashIconComponent } from '@eagami/ui';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';

import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  Inject,
  OnDestroy,
  OnInit,
  Output,
} from '@angular/core';
import { RouterLink } from '@angular/router';

import { ADMIN_CONTROLS_CONFIG_TOKEN } from '@app/directives/admin-controls.directive';
import { TooltipDirective } from '@app/directives/tooltip.directive';
import { AdminControlsConfig } from '@app/models/admin-controls-config.model';
import { IsDefinedPipe, RouterLinkPipe } from '@app/pipes';
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
  @Output() public destroyed = new EventEmitter<void>();

  public isTouchDevice = isTouchDevice();
  public showDeleteButton!: boolean;

  constructor(
    private readonly changeDetectorRef: ChangeDetectorRef,
    @Inject(ADMIN_CONTROLS_CONFIG_TOKEN) public config: AdminControlsConfig,
    private readonly elementRef: ElementRef,
    private readonly keyStateService: KeyStateService,
  ) {}

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
