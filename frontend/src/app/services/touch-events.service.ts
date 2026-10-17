import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';

import { IS_TOUCH_DEVICE } from '@app/tokens';

@Injectable({
  providedIn: 'root',
})
export class TouchEventsService {
  private readonly _document = inject<Document>(DOCUMENT);
  private readonly isTouchDevice = inject(IS_TOUCH_DEVICE);

  public listenForTouchEvents(): void {
    if (!this.isTouchDevice()) {
      return;
    }

    this._document.addEventListener('contextmenu', this.onContextMenu.bind(this), {
      capture: true, // Use capture phase to intercept event before it reaches handlers
      passive: false,
    });
  }

  private onContextMenu(event: MouseEvent): void {
    // If a tooltip is open, prevent the context menu from opening
    if (this._document.querySelector('.ea-tooltip')) {
      event.preventDefault();
    }
  }
}
