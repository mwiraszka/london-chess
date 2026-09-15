import { firstValueFrom } from 'rxjs';

import {
  Overlay,
  OverlayRef,
  PositionStrategy,
  ScrollStrategy,
} from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import {
  ComponentRef,
  DOCUMENT,
  Inject,
  Injectable,
  InjectionToken,
  Injector,
  Renderer2,
  RendererFactory2,
} from '@angular/core';

import { DialogComponent } from '@app/components/dialog/dialog.component';
import { DialogConfig, DialogOutput } from '@app/models';

export const DIALOG_CONFIG_TOKEN = new InjectionToken<DialogConfig<unknown>>(
  'Dialog Config',
);

@Injectable({
  providedIn: 'root',
})
export class DialogService {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private dialogComponentRefs: Array<ComponentRef<DialogComponent<any, any>>> = [];
  private documentClickListener?: () => void;
  private keydownListener?: () => void;
  private overlayRefs: OverlayRef[] = [];
  private renderer!: Renderer2;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  get topDialogRef(): ComponentRef<DialogComponent<any, any>> | null {
    return this.dialogComponentRefs.length
      ? this.dialogComponentRefs[this.dialogComponentRefs.length - 1]
      : null;
  }

  constructor(
    @Inject(DOCUMENT) private readonly _document: Document,
    private readonly overlay: Overlay,
    private readonly rendererFactory: RendererFactory2,
  ) {
    this.renderer = this.rendererFactory.createRenderer(null, null);
  }

  public async open<TComponent extends DialogOutput<TResult>, TResult>(
    dialogConfig: DialogConfig<TComponent>,
  ): Promise<TResult | 'close'> {
    // Prevent same-type dialogs from stacking
    if (
      this.topDialogRef?.instance?.dialogConfig?.componentType ===
      dialogConfig.componentType
    ) {
      return Promise.resolve('close');
    }

    const overlayContainerElement = this._document.querySelector(
      '.cdk-overlay-container',
    );
    if (overlayContainerElement) {
      // This style never gets removed, only overidden by other overlay directives/services
      this.renderer.setStyle(overlayContainerElement, 'z-index', '1100');
    }

    const injector = Injector.create({
      providers: [{ provide: DIALOG_CONFIG_TOKEN, useValue: dialogConfig }],
    });

    const dialogComponentPortal = new ComponentPortal(
      DialogComponent<TComponent, TResult>,
      null,
      injector,
    );

    const overlayRef = this.overlay.create({
      positionStrategy: this.getPositionStrategy(),
      scrollStrategy: this.getScrollStrategy(dialogConfig.isModal),
      hasBackdrop: dialogConfig.isModal,
      backdropClass: 'lcc-modal-backdrop',
    });

    const dialogComponentRef = overlayRef.attach(dialogComponentPortal);

    // Only init listeners once, when first overlay is created, and with timeout to prevent
    // the click event that opened up this dialog from being used
    if (this.overlayRefs.length === 0) {
      setTimeout(() => this.initEventListeners());
    }

    this.overlayRefs?.push(overlayRef);
    this.dialogComponentRefs.push(dialogComponentRef);

    return firstValueFrom(dialogComponentRef.instance.result).finally(() => {
      // Only dispose if this dialog is still in the array (might have been removed by closeAll())
      if (this.dialogComponentRefs.includes(dialogComponentRef)) {
        this.dispose();
      }
    });
  }

  public closeAll(): void {
    // Clear the arrays first so new dialogs can be added
    const dialogsToClose = [...this.dialogComponentRefs];
    const overlaysToClose = [...this.overlayRefs];

    this.dialogComponentRefs = [];
    this.overlayRefs = [];

    for (const dialogRef of dialogsToClose) {
      dialogRef.instance.result.emit('close');
    }

    for (const overlayRef of overlaysToClose) {
      overlayRef.dispose();
    }
  }

  private initEventListeners(): void {
    this.documentClickListener = this.renderer.listen(
      'document',
      'click',
      (event: PointerEvent) => {
        if (
          event.target instanceof HTMLElement &&
          event.target.classList.contains('cdk-overlay-backdrop')
        ) {
          event.stopImmediatePropagation();
          // Emit a close result; the tap in open() will handle disposal.
          this.topDialogRef?.instance.result.emit('close');
        }
      },
    );

    this.keydownListener = this.renderer.listen(
      'document',
      'keydown',
      (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          event.stopImmediatePropagation();
          this.topDialogRef?.instance.result.emit('close');
        }
      },
    );
  }

  private getPositionStrategy(): PositionStrategy {
    return this.overlay.position().global().centerHorizontally().centerVertically();
  }

  private getScrollStrategy(isModal?: boolean): ScrollStrategy {
    return isModal
      ? this.overlay.scrollStrategies.noop()
      : this.overlay.scrollStrategies.block();
  }

  private dispose(): void {
    const overlayRef = this.overlayRefs.pop();
    this.dialogComponentRefs.pop();

    if (overlayRef) {
      overlayRef.dispose();
    }

    // Only remove listeners when there are no more overlays
    if (this.overlayRefs.length === 0) {
      this.documentClickListener?.();
      this.keydownListener?.();
    }
  }
}
