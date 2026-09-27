import { BehaviorSubject, Observable } from 'rxjs';

import {
  Injectable,
  OnDestroy,
  Renderer2,
  RendererFactory2,
  inject,
} from '@angular/core';

import { IS_MAC } from '@app/tokens';

@Injectable({
  providedIn: 'root',
})
export class KeyStateService implements OnDestroy {
  private readonly isCtrlMetaKeyPressed = new BehaviorSubject<boolean>(false);
  private keydownListener?: () => void;
  private keyupListener?: () => void;
  private readonly renderer: Renderer2;

  private readonly isMac = inject(IS_MAC);

  constructor() {
    const rendererFactory = inject(RendererFactory2);

    this.renderer = rendererFactory.createRenderer(null, null);
    this.setupGlobalListeners();
  }

  public get ctrlMetaKeyPressed$(): Observable<boolean> {
    return this.isCtrlMetaKeyPressed.asObservable();
  }

  public ngOnDestroy(): void {
    this.keydownListener?.();
    this.keyupListener?.();
  }

  private setupGlobalListeners(): void {
    this.keydownListener = this.renderer.listen(
      'document',
      'keydown',
      (event: KeyboardEvent) => {
        if (
          (!this.isMac() && event.key === 'Control') ||
          (this.isMac() && event.key === 'Meta')
        ) {
          this.isCtrlMetaKeyPressed.next(true);
        }
      },
    );

    this.keyupListener = this.renderer.listen(
      'document',
      'keyup',
      (event: KeyboardEvent) => {
        if (
          (!this.isMac() && event.key === 'Control') ||
          (this.isMac() && event.key === 'Meta')
        ) {
          this.isCtrlMetaKeyPressed.next(false);
        }
      },
    );
  }
}
