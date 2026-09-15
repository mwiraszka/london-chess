import { DOCUMENT } from '@angular/common';
import { Inject, Injectable, inject } from '@angular/core';

import { IS_TOUCH_DEVICE } from '@app/tokens';

@Injectable({
  providedIn: 'root',
})
export class TouchEventsService {
  private readonly LONG_PRESS_DURATION_MS = 500;

  private touchTimeoutId: number | null = null;

  private readonly isTouchDevice = inject(IS_TOUCH_DEVICE);

  constructor(@Inject(DOCUMENT) private _document: Document) {}

  public listenForTouchEvents(): void {
    if (!this.isTouchDevice()) {
      return;
    }

    this._document.addEventListener('touchstart', this.onTouchStart.bind(this), {
      passive: false,
    });
    this._document.addEventListener('touchend', this.onTouchEnd.bind(this), {
      passive: false,
    });
    this._document.addEventListener('contextmenu', this.onContextMenu.bind(this), {
      capture: true, // Use capture phase to intercept event before it reaches handlers
      passive: false,
    });
  }

  private onTouchStart(event: TouchEvent): void {
    if (event.touches.length !== 1) {
      return;
    }

    this.clearTimeout();
    this.touchTimeoutId = window.setTimeout(
      () => this.onLongPress(event),
      this.LONG_PRESS_DURATION_MS,
    );
  }

  private onTouchEnd(): void {
    this.clearTimeout();
  }

  private onLongPress(originalEvent: TouchEvent): void {
    this.clearTimeout();

    const touch = originalEvent.touches[0];
    const target = originalEvent.target as HTMLElement;

    // Check if target or any of its ancestors has adminControls directive
    let currentElement: HTMLElement | null = target;
    let hasAdminControls = false;

    while (currentElement && !hasAdminControls) {
      if (currentElement.hasAttribute('adminControls')) {
        hasAdminControls = true;
      }
      currentElement = currentElement.parentElement;
    }

    // Only dispatch contextmenu if the element has adminControls
    if (hasAdminControls) {
      // Prevent default touch behaviour only for admin control elements
      originalEvent.preventDefault();

      // Create and dispatch a contextmenu event at the touch position
      const contextMenuEvent = new MouseEvent('contextmenu', {
        bubbles: true,
        cancelable: true,
        clientX: touch.clientX,
        clientY: touch.clientY,
      });

      originalEvent.target?.dispatchEvent(contextMenuEvent);

      // Prevent text selection that might occur with long press
      if (window.getSelection) {
        const selection = window.getSelection();
        if (selection) {
          selection.removeAllRanges();
        }
      }
    }
  }

  private onContextMenu(event: MouseEvent): void {
    // If a tooltip is open, prevent the context menu from opening
    if (this._document.querySelector('.cdk-overlay-container lcc-tooltip')) {
      event.preventDefault();
    }
  }

  private clearTimeout(): void {
    if (this.touchTimeoutId !== null) {
      window.clearTimeout(this.touchTimeoutId);
      this.touchTimeoutId = null;
    }
  }
}
