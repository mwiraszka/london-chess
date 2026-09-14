import { BehaviorSubject } from 'rxjs';

import { Injectable, inject } from '@angular/core';

import { IS_TOUCH_DEVICE } from '@app/tokens';

@Injectable({
  providedIn: 'root',
})
export class RefreshService {
  public readonly isRefreshing$ = new BehaviorSubject<boolean>(false);

  private readonly MAX_PULL_DISTANCE_PX = 120;
  private readonly PULL_THRESHOLD_PX = 80;
  private readonly RESISTANCE = 0.5;

  private currentPullDistancePx = 0;
  private mainElement: HTMLElement | null = null;
  private touchStartY = 0;

  private readonly boundOnTouchStart = this.onTouchStart.bind(this);
  private readonly boundOnTouchMove = this.onTouchMove.bind(this);
  private readonly boundOnTouchEnd = this.onTouchEnd.bind(this);

  private readonly isTouchDevice = inject(IS_TOUCH_DEVICE);

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

  public completeRefresh(): void {
    this.currentPullDistancePx = 0;
    this.isRefreshing$.next(false);
  }

  private onTouchStart(event: TouchEvent): void {
    if (this.isRefreshing$.value || !this.mainElement) {
      return;
    }

    // Allow pull-to-refresh when at the top (with small tolerance for scroll momentum)
    if (this.mainElement.scrollTop > 5) {
      return;
    }

    this.touchStartY = event.touches[0].clientY;
  }

  private onTouchMove(event: TouchEvent): void {
    if (this.isRefreshing$.value || !this.mainElement || this.touchStartY === 0) {
      return;
    }

    const touchY = event.touches[0].clientY;
    const pullDistance = touchY - this.touchStartY;

    // Track pull distance without preventing default scroll behavior
    if (pullDistance > 0 && this.mainElement.scrollTop <= 5) {
      this.currentPullDistancePx = Math.min(
        pullDistance * this.RESISTANCE,
        this.MAX_PULL_DISTANCE_PX,
      );
    } else if (pullDistance <= 0) {
      // Reset if user starts pulling up
      this.currentPullDistancePx = 0;
    }
  }

  private onTouchEnd(): void {
    if (this.isRefreshing$.value || this.touchStartY === 0) {
      return;
    }

    this.touchStartY = 0;

    if (this.currentPullDistancePx >= this.PULL_THRESHOLD_PX) {
      this.isRefreshing$.next(true);
    }

    this.currentPullDistancePx = 0;
  }
}
