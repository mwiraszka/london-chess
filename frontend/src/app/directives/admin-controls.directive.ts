import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';

import {
  ConnectedPosition,
  Overlay,
  OverlayRef,
  PositionStrategy,
  ScrollStrategy,
} from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import {
  ComponentRef,
  DOCUMENT,
  Directive,
  ElementRef,
  HostListener,
  Inject,
  InjectionToken,
  Injector,
  Input,
  OnDestroy,
  Renderer2,
  ViewContainerRef,
} from '@angular/core';

import { AdminControlsConfig } from '@app/models';
import { DialogService } from '@app/services';

import { AdminControlsComponent } from '../components/admin-controls/admin-controls.component';

export const ADMIN_CONTROLS_CONFIG_TOKEN = new InjectionToken<AdminControlsConfig>(
  'Admin Controls Config',
);

@UntilDestroy()
@Directive({
  selector: '[adminControls]',
})
export class AdminControlsDirective implements OnDestroy {
  @Input() public adminControls: AdminControlsConfig | null = null;

  private adminControlsComponentRef: ComponentRef<AdminControlsComponent> | null = null;
  private documentClickListener?: () => void;
  private documentContextMenuListener?: () => void;
  private escapeKeyListener?: () => void;
  private overlayRef: OverlayRef | null = null;

  constructor(
    private readonly dialogService: DialogService,
    @Inject(DOCUMENT) private _document: Document,
    private readonly elementRef: ElementRef<HTMLElement>,
    private readonly overlay: Overlay,
    private readonly renderer: Renderer2,
    private readonly viewContainerRef: ViewContainerRef,
  ) {}

  public ngOnDestroy(): void {
    this.overlayRef?.dispose();
  }

  @HostListener('contextmenu', ['$event'])
  public onContextMenu(event: MouseEvent): void {
    if (this.adminControls && !this.overlayRef?.hasAttached()) {
      // Only prevent context menu if no text is selected
      const selection = window.getSelection();
      if (!selection || selection.toString().trim() === '') {
        // If the element's top is scrolled above its scroll container's visible top,
        // skip opening the admin controls (let native context menu occur instead)
        const hostEl = this.elementRef.nativeElement as HTMLElement;
        const scroller = hostEl.closest('.image-grid') as HTMLElement | null;
        if (scroller) {
          const elRect = hostEl.getBoundingClientRect();
          const scRect = scroller.getBoundingClientRect();
          if (elRect.top < scRect.top) {
            // Partially hidden above the viewport of the scrolling grid
            return;
          }
        }
        event.preventDefault();
        this.attach();
      }
    }
  }

  private attach(): void {
    if (this.overlayRef === null) {
      const positionStrategy = this.getPositionStrategy();
      const scrollStrategy = this.getScrollStrategy();
      this.overlayRef = this.overlay.create({ positionStrategy, scrollStrategy });
    }

    const injector = Injector.create({
      providers: [
        {
          provide: ADMIN_CONTROLS_CONFIG_TOKEN,
          useValue: this.adminControls,
        },
      ],
    });

    const componentPortal = new ComponentPortal(
      AdminControlsComponent,
      this.viewContainerRef,
      injector,
    );
    this.adminControlsComponentRef = this.overlayRef.attach(componentPortal);

    this.adminControlsComponentRef.instance.destroyed
      .pipe(untilDestroyed(this))
      .subscribe(() => this.detach());

    setTimeout(() => {
      this.initEventListeners();
    });

    const overlayContainerElement = this._document.querySelector(
      '.cdk-overlay-container',
    );

    if (overlayContainerElement && this.dialogService.topDialogRef) {
      // Rendered on top of an open dialog, so render over the sticky app header (z-index: 1000)
      this.renderer.setStyle(overlayContainerElement, 'z-index', '1100');
    } else {
      // Rendered somewhere in main app, so render under the sticky app header
      this.renderer.setStyle(overlayContainerElement, 'z-index', '900');
    }
  }

  public detach(): void {
    this.overlayRef?.detach();
    this.documentClickListener?.();
    this.documentContextMenuListener?.();
    this.escapeKeyListener?.();
  }

  private getPositionStrategy(): PositionStrategy {
    const position: ConnectedPosition = {
      originX: 'start',
      originY: 'top',
      overlayX: 'start',
      overlayY: 'top',
      panelClass: 'bottom',
    };

    return this.overlay
      .position()
      .flexibleConnectedTo(this.elementRef)
      .withPositions([position]);
  }

  private getScrollStrategy(): ScrollStrategy {
    return this.overlay.scrollStrategies.close();
  }

  private initEventListeners(): void {
    this.documentClickListener = this.renderer.listen(
      'document',
      'click',
      (event: PointerEvent) => {
        event.stopPropagation();
        this.detach();
      },
    );

    this.escapeKeyListener = this.renderer.listen(
      'document',
      'keydown.escape',
      (event: KeyboardEvent) => {
        event.stopPropagation();
        this.detach();
      },
    );

    this.documentContextMenuListener = this.renderer.listen(
      'document',
      'contextmenu',
      (event: PointerEvent) => {
        event.preventDefault();
        this.detach();
      },
    );
  }
}
