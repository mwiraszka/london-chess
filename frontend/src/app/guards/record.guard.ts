import { Actions, ofType } from '@ngrx/effects';
import { Action, ActionCreator, MemoizedSelector, Store } from '@ngrx/store';
import { EMPTY, Observable, defer, merge, of } from 'rxjs';
import { filter, map, switchMap, take } from 'rxjs/operators';

import { inject } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  type CanActivateFn,
  Router,
  UrlTree,
} from '@angular/router';

import { LccError } from '@app/models';
import { isDefined } from '@app/utils';

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

// A stored record shows at once; a missing one is fetched first, and a 404 goes home
// without the page showing
export function recordGuard<T>(config: RecordGuardConfig<T>): CanActivateFn {
  return (route: ActivatedRouteSnapshot): Observable<boolean | UrlTree> | UrlTree => {
    const value = route.paramMap.get(config.param);
    const router = inject(Router);
    if (!config.isWellFormed(value)) {
      return router.createUrlTree(['/']);
    }

    const store = inject(Store);
    const actions$ = inject(Actions);
    const selector = config.select(value);

    return store.select(selector).pipe(
      take(1),
      switchMap(record => {
        if (record !== null) {
          if (config.refreshes) {
            store.dispatch(config.request(value));
          }
          return of(true);
        }

        const settled$ = merge(
          store.select(selector).pipe(
            filter(isDefined),
            map(() => true),
          ),
          actions$.pipe(
            ofType(config.failed),
            map(({ error }) =>
              error.status === 404 ? router.createUrlTree(['/']) : true,
            ),
          ),
        ).pipe(take(1));

        // Subscribed before the request, so a synchronous reply is not missed
        return merge(
          settled$,
          defer(() => {
            store.dispatch(config.request(value));
            return EMPTY;
          }),
        );
      }),
    );
  };
}
