import { BehaviorSubject, Observable } from 'rxjs';
import { filter, map, pairwise, startWith } from 'rxjs/operators';

import { Injectable } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';

import { DialogService } from './dialog.service';

const withoutQuery = (url: string): string => url.replace(/\?[^#]*/, '');

function isQueryOnlyChange(previous: string, next: string): boolean {
  return previous !== next && withoutQuery(previous) === withoutQuery(next);
}

@Injectable({
  providedIn: 'root',
})
export class RoutingService {
  private _fragmentSubject = new BehaviorSubject<string | null>(null);

  public readonly fragment$: Observable<string | null> =
    this._fragmentSubject.asObservable();

  // The fragment of each navigation to a page. A change of query alone is left out,
  // being a page refining what it shows rather than the visitor moving elsewhere
  public readonly pageNavigated$: Observable<string | null>;

  get currentFragment(): string | null {
    return this._fragmentSubject.getValue();
  }

  constructor(
    private readonly dialogService: DialogService,
    private readonly router: Router,
  ) {
    const fragment = this.router.parseUrl(this.router.url).fragment;
    this._fragmentSubject.next(fragment);

    this.pageNavigated$ = this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map(event => event.urlAfterRedirects),
      startWith(this.router.url),
      pairwise(),
      filter(([previous, next]) => !isQueryOnlyChange(previous, next)),
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
