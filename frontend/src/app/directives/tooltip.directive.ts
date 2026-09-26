import {
  ConnectedPosition,
  Overlay,
  OverlayRef,
  PositionStrategy,
} from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import {
  DOCUMENT,
  Directive,
  ElementRef,
  InjectionToken,
  Injector,
  OnDestroy,
  Renderer2,
  TemplateRef,
  ViewContainerRef,
  inject,
  input,
} from '@angular/core';

import { TooltipComponent } from '@app/components/tooltip/tooltip.component';
import { Pixels } from '@app/models';
import { isDefined } from '@app/utils';

export const TOOLTIP_CONTENT_TOKEN = new InjectionToken<string | TemplateRef<unknown>>(
  'Tooltip Content',
);

export const TOOLTIP_CONTEXT_TOKEN = new InjectionToken<unknown>('Tooltip Context');

@Directive({
  selector: '[tooltip]',
  host: {
    '(mouseenter)': 'attach($event)',
    '(focus)': 'attach($event)',
    '(mouseleave)': 'detach()',
    '(blur)': 'detach()',
  },
})
export class TooltipDirective implements OnDestroy {
  private readonly _document = inject<Document>(DOCUMENT);
  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly overlay = inject(Overlay);
  private readonly renderer = inject(Renderer2);
  private readonly viewContainerRef = inject(ViewContainerRef);

  public readonly tooltip = input<string | TemplateRef<unknown> | null>(null);
  public readonly tooltipContext = input<unknown>(null);

  private overlayRef: OverlayRef | null = null;

  public attach(event?: MouseEvent | FocusEvent): void {
    const tooltip = this.tooltip();
    if (isDefined(tooltip) && !this.overlayRef?.hasAttached()) {
      const clientY: Pixels | undefined =
        event instanceof MouseEvent ? event.clientY : undefined;

      if (this.overlayRef === null) {
        this.overlayRef = this.overlay.create({
          positionStrategy: this.getPositionStrategy(clientY),
          scrollStrategy: this.overlay.scrollStrategies.close(),
        });
      }

      const injector = Injector.create({
        providers: [
          {
            provide: TOOLTIP_CONTENT_TOKEN,
            useValue: tooltip,
          },
          {
            provide: TOOLTIP_CONTEXT_TOKEN,
            useValue: this.tooltipContext(),
          },
        ],
      });

      const componentPortal = new ComponentPortal(
        TooltipComponent,
        this.viewContainerRef,
        injector,
      );

      const componentRef = this.overlayRef.attach(componentPortal);

      const overlayContainerElement = this._document.querySelector(
        '.cdk-overlay-container',
      );
      if (overlayContainerElement) {
        this.renderer.setStyle(overlayContainerElement, 'z-index', '1200');
      }

      // Enable pointer events if tooltip content is a template (interactive content)
      if (tooltip instanceof TemplateRef && componentRef.location.nativeElement) {
        this.renderer.setStyle(
          componentRef.location.nativeElement,
          'pointer-events',
          'auto',
        );
      }
    }
  }

  public detach(): void {
    if (this.overlayRef?.hasAttached()) {
      this.overlayRef?.detach();
    }
  }

  public ngOnDestroy(): void {
    this.overlayRef?.dispose();
  }

  private getPositionStrategy(clientY?: Pixels): PositionStrategy {
    const positionsBelow: ConnectedPosition[] = [
      {
        originX: 'center',
        originY: 'bottom',
        overlayX: 'center',
        overlayY: 'top',
        panelClass: 'bottom',
        offsetY: 4,
      },
      {
        originX: 'start',
        originY: 'bottom',
        overlayX: 'start',
        overlayY: 'top',
        panelClass: 'bottom',
        offsetY: 4,
      },
      {
        originX: 'end',
        originY: 'bottom',
        overlayX: 'end',
        overlayY: 'top',
        panelClass: 'bottom',
        offsetY: 4,
      },
    ];

    const positionsAbove: ConnectedPosition[] = [
      {
        originX: 'center',
        originY: 'top',
        overlayX: 'center',
        overlayY: 'bottom',
        panelClass: 'top',
        offsetY: -4,
      },
      {
        originX: 'start',
        originY: 'top',
        overlayX: 'start',
        overlayY: 'bottom',
        panelClass: 'top',
        offsetY: -4,
      },
      {
        originX: 'end',
        originY: 'top',
        overlayX: 'end',
        overlayY: 'bottom',
        panelClass: 'top',
        offsetY: -4,
      },
    ];

    // Due to word wrapping in the Tooltip Component itself, the height of the tooltip container is
    // not known at this stage, so assume there's enough space above if the client is at least
    // 200px down from the top of the screen
    const preferredPositions =
      clientY && clientY > 200
        ? [...positionsAbove, ...positionsBelow]
        : [...positionsBelow, ...positionsAbove];

    return this.overlay
      .position()
      .flexibleConnectedTo(this.elementRef)
      .withPositions(preferredPositions);
  }
}
