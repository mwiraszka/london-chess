import { Actions, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';
import { filter, map, take } from 'rxjs/operators';

import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, type CanActivateFn, Router } from '@angular/router';

import { MembersActions } from '@app/store/members';
import { isMemberNumber } from '@app/utils';

// The member is loaded before the route activates, so a missing member never renders the page.
// A malformed number goes home without a request, and a failed fetch is left to the effect
// that navigates away from missing records
export function memberProfileGuard(param: string): CanActivateFn {
  return (route: ActivatedRouteSnapshot) => {
    const value = route.paramMap.get(param);
    if (!isMemberNumber(value)) {
      return inject(Router).createUrlTree(['/']);
    }

    const memberNumber = Number(value);
    const actions$ = inject(Actions);
    const store = inject(Store);

    return new Observable<boolean>(subscriber => {
      // Listening starts before the request, so a result that arrives immediately is not missed
      const subscription = actions$
        .pipe(
          ofType(MembersActions.fetchMemberSucceeded, MembersActions.fetchMemberFailed),
          filter(
            action =>
              action.type === MembersActions.fetchMemberFailed.type ||
              action.member.number === memberNumber,
          ),
          take(1),
          map(action => action.type === MembersActions.fetchMemberSucceeded.type),
        )
        .subscribe(subscriber);

      store.dispatch(MembersActions.fetchMemberByNumberRequested({ memberNumber }));
      return subscription;
    });
  };
}
