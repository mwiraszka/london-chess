import { Actions, ofType } from '@ngrx/effects';
import { Action, ActionCreator, MemoizedSelector, Store } from '@ngrx/store';
import { filter, take, takeUntil } from 'rxjs/operators';

import { inject } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  type CanActivateFn,
  NavigationStart,
  Router,
  UrlTree,
} from '@angular/router';

import { LccError } from '@app/models';

type FailedAction = { error: LccError } & Action<string>;

export interface RecordGuardConfig<T> {
  param: string;
  isWellFormed: (value: string | null) => value is string;
  select: (value: string) => MemoizedSelector<object, T | null>;
  request: (value: string) => Action;
  failed: ActionCreator<string, (props: { error: LccError }) => FailedAction>;
  // Fetch a stored record again as it shows
  refreshes: boolean;
}

// The page opens at once, showing its skeletons while a missing record is fetched, and a
// record that turns out not to exist sends the visitor home
export function recordGuard<T>(config: RecordGuardConfig<T>): CanActivateFn {
  return (route: ActivatedRouteSnapshot): boolean | UrlTree => {
    const value = route.paramMap.get(config.param);
    const router = inject(Router);
    if (!config.isWellFormed(value)) {
      return router.createUrlTree(['/']);
    }

    const store = inject(Store);
    const isStored = store.selectSignal(config.select(value))() !== null;
    if (isStored && !config.refreshes) {
      return true;
    }

    if (!isStored) {
      inject(Actions)
        .pipe(
          ofType(config.failed),
          take(1),
          takeUntil(
            router.events.pipe(filter(event => event instanceof NavigationStart)),
          ),
        )
        .subscribe(({ error }) => {
          if (error.status === 404) {
            void router.navigateByUrl('/', { replaceUrl: true });
          }
        });
    }
    store.dispatch(config.request(value));
    return true;
  };
}
