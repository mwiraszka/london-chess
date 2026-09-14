import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, type CanActivateFn, Router } from '@angular/router';

import { isMemberNumber } from '@app/utils';

// A malformed number can never resolve to a member, so it goes home without a request
export function memberNumberGuard(param: string): CanActivateFn {
  return (route: ActivatedRouteSnapshot) =>
    isMemberNumber(route.paramMap.get(param)) || inject(Router).createUrlTree(['/']);
}
