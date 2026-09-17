import { Store } from '@ngrx/store';
import { filter, take } from 'rxjs/operators';

import { Injectable, Injector, computed, inject, signal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';

import { refreshAppRequested } from '@app/store/app/app.actions';
import { IS_TOUCH_DEVICE } from '@app/tokens';

import { PendingRequestsService } from './pending-requests.service';

@Injectable({
  providedIn: 'root',
})
export class RefreshService {
  private readonly injector = inject(Injector);
  private readonly isTouchDevice = inject(IS_TOUCH_DEVICE);
  private readonly pendingRequests = inject(PendingRequestsService);
  private readonly store = inject(Store);

  private readonly MAX_PULL_DISTANCE_PX = 120;
  private readonly PULL_THRESHOLD_PX = 80;
  private readonly RESISTANCE = 0.5;

  private readonly pullDistancePx = signal(0);

  readonly isRefreshing = signal(false);
  readonly pullProgress = computed(() =>
    Math.min(this.pullDistancePx() / this.PULL_THRESHOLD_PX, 1),
  );

  private mainElement: HTMLElement | null = null;
  private touchStartY = 0;

  private readonly boundOnTouchStart = this.onTouchStart.bind(this);
  private readonly boundOnTouchMove = this.onTouchMove.bind(this);
  private readonly boundOnTouchEnd = this.onTouchEnd.bind(this);

  public initialize(mainElement: HTMLElement): void {
    if (!this.isTouchDevice()) {
      return;
    }

    this.mainElement = mainElement;
    this.mainElement.addEventListener('touchstart', this.boundOnTouchStart, {
      passive: true,
    });
    this.mainElement.addEventListener('touchmove', this.boundOnTouchMove, {
      passive: false,
    });
    this.mainElement.addEventListener('touchend', this.boundOnTouchEnd, {
      passive: true,
    });
  }

  public destroy(): void {
    if (!this.mainElement) {
      return;
    }

    this.mainElement.removeEventListener('touchstart', this.boundOnTouchStart);
    this.mainElement.removeEventListener('touchmove', this.boundOnTouchMove);
    this.mainElement.removeEventListener('touchend', this.boundOnTouchEnd);
  }

  private onTouchStart(event: TouchEvent): void {
    if (this.isRefreshing() || !this.mainElement) {
      return;
    }

    // Allow pull-to-refresh when at the top (with small tolerance for scroll momentum)
    if (this.mainElement.scrollTop > 5) {
      return;
    }

    this.touchStartY = event.touches[0].clientY;
  }

  private onTouchMove(event: TouchEvent): void {
    if (this.isRefreshing() || !this.mainElement || this.touchStartY === 0) {
      return;
    }

    const pullDistance = event.touches[0].clientY - this.touchStartY;

    if (pullDistance > 0 && this.mainElement.scrollTop <= 5) {
      this.pullDistancePx.set(
        Math.min(pullDistance * this.RESISTANCE, this.MAX_PULL_DISTANCE_PX),
      );
    } else if (pullDistance <= 0) {
      this.pullDistancePx.set(0);
    }
  }

  private onTouchEnd(): void {
    if (this.isRefreshing() || this.touchStartY === 0) {
      return;
    }

    this.touchStartY = 0;

    if (this.pullDistancePx() >= this.PULL_THRESHOLD_PX) {
      this.refresh();
    }

    this.pullDistancePx.set(0);
  }

  // The requests a refresh sets off start while it is dispatched, so the refresh
  // is over once no request is left pending
  private refresh(): void {
    this.isRefreshing.set(true);
    this.store.dispatch(refreshAppRequested());

    toObservable(this.pendingRequests.hasPendingRequests, { injector: this.injector })
      .pipe(
        filter(hasPendingRequests => !hasPendingRequests),
        take(1),
      )
      .subscribe(() => this.isRefreshing.set(false));
  }
}
