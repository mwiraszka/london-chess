import { BehaviorSubject, Observable } from 'rxjs';
import { filter, map, pairwise, startWith } from 'rxjs/operators';

import { Injectable, inject } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';

import { DialogService } from './dialog.service';

// Passed as a navigation's `info` by a link to a page laid out like the one being
// left, so the visitor's scroll position is kept rather than reset
export const KEEP_SCROLL = { keepScroll: true } as const;

const keepsScroll = (info: unknown): boolean =>
  typeof info === 'object' &&
  info !== null &&
  (info as { keepScroll?: unknown }).keepScroll === true;

const withoutQuery = (url: string): string => url.replace(/\?[^#]*/, '');

function isQueryOnlyChange(previous: string, next: string): boolean {
  return previous !== next && withoutQuery(previous) === withoutQuery(next);
}

@Injectable({
  providedIn: 'root',
})
export class RoutingService {
  private readonly dialogService = inject(DialogService);
  private readonly router = inject(Router);

  private _fragmentSubject = new BehaviorSubject<string | null>(null);

  public readonly fragment$: Observable<string | null> =
    this._fragmentSubject.asObservable();

  // The fragment of each navigation to a page. Left out are a change of query alone,
  // being a page refining what it shows rather than the visitor moving elsewhere, and
  // navigations that ask to keep the scroll position
  public readonly pageNavigated$: Observable<string | null>;

  get currentFragment(): string | null {
    return this._fragmentSubject.getValue();
  }

  constructor() {
    const fragment = this.router.parseUrl(this.router.url).fragment;
    this._fragmentSubject.next(fragment);

    this.pageNavigated$ = this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map(event => event.urlAfterRedirects),
      startWith(this.router.url),
      pairwise(),
      filter(
        ([previous, next]) =>
          !isQueryOnlyChange(previous, next) &&
          !keepsScroll(this.router.lastSuccessfulNavigation()?.extras.info),
      ),
      map(([, next]) => this.router.parseUrl(next).fragment),
    );

    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        const fragment = this.router.parseUrl(this.router.url).fragment;

        if (this.currentFragment && this.currentFragment !== fragment) {
          this.dialogService.closeAll();
        }

        this._fragmentSubject.next(fragment);
      });
  }

  public removeFragment(): void {
    if (!this._fragmentSubject.getValue()) {
      return;
    }

    this.router.navigate([], {
      fragment: undefined,
      queryParamsHandling: 'preserve',
      replaceUrl: true,
    });

    this._fragmentSubject.next(null);
  }
}
