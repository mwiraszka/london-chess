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
  Directive,
  ElementRef,
  EventEmitter,
  HostListener,
  Output,
  Renderer2,
  ViewContainerRef,
} from '@angular/core';

import { UserSettingsMenuComponent } from '@app/components/user-settings-menu/user-settings-menu.component';

@UntilDestroy()
@Directive({
  selector: '[dropdown]',
})
export class DropdownDirective {
  // Hardcoded for UserSettingsMenuComponent since it's the only component currently using
  // this directive
  private componentRef: ComponentRef<UserSettingsMenuComponent> | null = null;
  private documentClickListener?: () => void;
  private documentContextMenuListener?: () => void;
  private escapeKeyListener?: () => void;
  private overlayRef: OverlayRef | null = null;

  @Output() public readonly isOpen = new EventEmitter<boolean>();

  constructor(
    private readonly elementRef: ElementRef<HTMLElement>,
    private readonly overlay: Overlay,
    private readonly renderer: Renderer2,
    private readonly viewContainerRef: ViewContainerRef,
  ) {}

  public ngOnDestroy(): void {
    this.overlayRef?.dispose();
  }

  @HostListener('click')
  public onClick(): void {
    if (this.overlayRef?.hasAttached()) {
      this.detach();
    } else {
      this.attach();
    }
  }

  private attach(): void {
    if (this.overlayRef === null) {
      const positionStrategy = this.getPositionStrategy();
      const scrollStrategy = this.getScrollStrategy();
      this.overlayRef = this.overlay.create({ positionStrategy, scrollStrategy });
    }

    const componentPortal = new ComponentPortal(
      UserSettingsMenuComponent,
      this.viewContainerRef,
    );

    this.componentRef = this.overlayRef.attach(componentPortal);

    this.componentRef.instance.close
      .pipe(untilDestroyed(this))
      .subscribe(() => this.detach());

    setTimeout(() => {
      this.initEventListeners();
    });

    this.renderer.setStyle(this.elementRef.nativeElement, 'outline', 'none');

    this.isOpen.emit(true);
  }

  private detach(): void {
    this.overlayRef?.detach();
    this.documentClickListener?.();
    this.documentContextMenuListener?.();
    this.escapeKeyListener?.();

    this.renderer.removeStyle(this.elementRef.nativeElement, 'outline');

    this.isOpen.emit(false);
  }

  private getPositionStrategy(): PositionStrategy {
    const position: ConnectedPosition = {
      originX: 'end',
      originY: 'bottom',
      overlayX: 'end',
      overlayY: 'top',
      offsetY: 3,
      panelClass: 'bottom',
    };

    return this.overlay
      .position()
      .flexibleConnectedTo(this.elementRef)
      .withPositions([position]);
  }

  private getScrollStrategy(): ScrollStrategy {
    return this.overlay.scrollStrategies.reposition();
  }

  private initEventListeners(): void {
    this.documentClickListener = this.renderer.listen(
      'document',
      'click',
      (event: PointerEvent) => {
        if (
          event.target instanceof HTMLElement &&
          !this.componentRef?.location.nativeElement.contains(event.target)
        ) {
          this.detach();
        }
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
