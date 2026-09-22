import { take } from 'rxjs/operators';

import { ConnectedPosition, Overlay, OverlayRef } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import {
  ComponentRef,
  DOCUMENT,
  Injectable,
  InjectionToken,
  Injector,
  RendererFactory2,
  ViewContainerRef,
  inject,
} from '@angular/core';

import { AdminControlsComponent } from '@app/components/admin-controls/admin-controls.component';
import { AdminControlsConfig } from '@app/models';

import { DialogService } from './dialog.service';

export const ADMIN_CONTROLS_CONFIG_TOKEN = new InjectionToken<AdminControlsConfig>(
  'Admin Controls Config',
);

export type AdminControlsPlacement = 'top' | 'center';

// At the top left corner of the item, or centred on its left edge
const POSITIONS: Record<AdminControlsPlacement, ConnectedPosition> = {
  top: {
    originX: 'start',
    originY: 'top',
    overlayX: 'start',
    overlayY: 'top',
    panelClass: 'bottom',
  },
  center: {
    originX: 'start',
    originY: 'center',
    overlayX: 'start',
    overlayY: 'center',
    panelClass: 'bottom',
  },
};

// Shows one item's admin controls at a time, at the top left corner of the item
@Injectable({ providedIn: 'root' })
export class AdminControlsService {
  private readonly dialogService = inject(DialogService);
  private readonly document = inject(DOCUMENT);
  private readonly overlay = inject(Overlay);
  private readonly renderer = inject(RendererFactory2).createRenderer(null, null);

  private overlayRef: OverlayRef | null = null;
  private componentRef: ComponentRef<AdminControlsComponent> | null = null;
  private stopListening: (() => void)[] = [];

  public get isOpen(): boolean {
    return !!this.overlayRef?.hasAttached();
  }

  public open(
    config: AdminControlsConfig,
    anchor: Element,
    viewContainerRef?: ViewContainerRef,
    placement: AdminControlsPlacement = 'top',
  ): void {
    this.close();
    this.overlayRef?.dispose();
    this.overlayRef = this.overlay.create({
      positionStrategy: this.overlay
        .position()
        .flexibleConnectedTo(anchor)
        .withPositions([POSITIONS[placement]]),
      scrollStrategy: this.overlay.scrollStrategies.close(),
    });

    const injector = Injector.create({
      providers: [{ provide: ADMIN_CONTROLS_CONFIG_TOKEN, useValue: config }],
    });
    this.componentRef = this.overlayRef.attach(
      new ComponentPortal(AdminControlsComponent, viewContainerRef, injector),
    );
    this.componentRef.instance.destroyed.pipe(take(1)).subscribe(() => this.close());

    // The click that opened the controls must not be the one that closes them
    setTimeout(() => this.listen());

    const overlayContainer = this.document.querySelector('.cdk-overlay-container');
    if (overlayContainer) {
      // Over an open dialog (z-index 1000), otherwise under the sticky app header
      this.renderer.setStyle(
        overlayContainer,
        'z-index',
        this.dialogService.topDialogRef ? '1100' : '900',
      );
    }
  }

  public close(): void {
    this.overlayRef?.detach();
    this.stopListening.forEach(stop => stop());
    this.stopListening = [];
  }

  private listen(): void {
    this.stopListening = [
      this.renderer.listen('document', 'click', (event: PointerEvent) => {
        event.stopPropagation();
        this.close();
      }),
      this.renderer.listen('document', 'keydown.escape', (event: KeyboardEvent) => {
        event.stopPropagation();
        this.close();
      }),
      this.renderer.listen('document', 'contextmenu', (event: PointerEvent) => {
        event.preventDefault();
        this.close();
      }),
    ];
  }
}
