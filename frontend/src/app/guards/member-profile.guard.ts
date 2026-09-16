import { Store } from '@ngrx/store';

import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, type CanActivateFn, Router } from '@angular/router';

import { MembersActions } from '@app/store/members';
import { isMemberNumber } from '@app/utils';

// A malformed number goes home without a request. Any other member loads while the page
// shows, and a missing one is left to the effect that navigates away from missing records
export function memberProfileGuard(param: string): CanActivateFn {
  return (route: ActivatedRouteSnapshot) => {
    const value = route.paramMap.get(param);
    if (!isMemberNumber(value)) {
      return inject(Router).createUrlTree(['/']);
    }

    inject(Store).dispatch(
      MembersActions.fetchMemberByNumberRequested({ memberNumber: Number(value) }),
    );
    return true;
  };
}
