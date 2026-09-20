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
  // Whether a stored record is fetched again as it shows, for records that change
  refreshes: boolean;
}

/**
 * Holds the navigation until the record is known to exist. One already in the store
 * shows at once, one that is not is fetched first, and one the server does not have
 * goes home without the page ever showing. Any other failure lets the page show, so it
 * can offer to try again.
 */
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

        // The outcome is awaited before the request goes out, so a reply is never missed
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
