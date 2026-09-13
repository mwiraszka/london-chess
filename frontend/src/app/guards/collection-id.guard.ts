import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, type CanActivateFn, Router } from '@angular/router';

import { isCollectionId } from '@app/utils';

// A malformed id can never resolve to a record, so it goes home without a request
export function collectionIdGuard(param: string): CanActivateFn {
  return (route: ActivatedRouteSnapshot) =>
    isCollectionId(route.paramMap.get(param)) || inject(Router).createUrlTree(['/']);
}
