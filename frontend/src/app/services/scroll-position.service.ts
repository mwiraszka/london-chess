import { fromEvent, merge } from 'rxjs';
import { filter, take } from 'rxjs/operators';

import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationStart, Router } from '@angular/router';

import { RoutingService } from './routing.service';

const VISITOR_INPUT = { capture: true, passive: true };

const storageKey = (url: string): string => `lcc-scroll-position:${url}`;

const wasLoadedByHistory = (): boolean =>
  performance
    .getEntriesByType('navigation')
    .some(entry => 'type' in entry && entry.type === 'back_forward');

// Pages scroll inside the app's own scroller, which browsers do not restore for us. The
// positions outlive the app, since coming back from another site loads it afresh
@Injectable({
  providedIn: 'root',
})
export class ScrollPositionService {
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);
  private readonly routingService = inject(RoutingService);

  private readonly navigationStart$ = this.router.events.pipe(
    filter(event => event instanceof NavigationStart),
  );

  public readonly isHoldingPosition = signal(false);

  public initialize(scroller: HTMLElement, content: HTMLElement): void {
    merge(
      this.navigationStart$.pipe(filter(() => this.router.navigated)),
      fromEvent(window, 'pagehide'),
    )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() =>
        sessionStorage.setItem(storageKey(this.router.url), `${scroller.scrollTop}`),
      );

    this.routingService.pageNavigated$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(fragment => {
        const position = this.isHistoryStep()
          ? Number(sessionStorage.getItem(storageKey(this.router.url)))
          : 0;

        if (position) {
          this.holdPosition(scroller, content, position);
        } else if (!fragment) {
          scroller.scrollTo({ top: 0 });
        }
      });
  }

  private isHistoryStep(): boolean {
    const navigation = this.router.lastSuccessfulNavigation();
    return (
      navigation?.trigger === 'popstate' ||
      (!navigation?.previousNavigation && wasLoadedByHistory())
    );
  }

  // A page fills in after it opens, so the position is reapplied as it grows, until the
  // visitor takes over
  private holdPosition(scroller: HTMLElement, content: HTMLElement, top: number): void {
    const observer = new ResizeObserver(() => scroller.scrollTo({ top }));
    observer.observe(content);
    this.isHoldingPosition.set(true);

    merge(
      fromEvent(window, 'keydown', VISITOR_INPUT),
      fromEvent(window, 'pointerdown', VISITOR_INPUT),
      fromEvent(window, 'wheel', VISITOR_INPUT),
      this.navigationStart$,
    )
      .pipe(take(1), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        observer.disconnect();
        this.isHoldingPosition.set(false);
      });
  }
}
