import { Store } from '@ngrx/store';
import { startCase } from 'lodash';

import { inject } from '@angular/core';
import { type CanActivateFn, Router } from '@angular/router';

import { AuthDrawerService } from '@app/services';
import { AuthSelectors } from '@app/store/auth';
import { NavActions } from '@app/store/nav';
import { declaredAccess, hasAccess } from '@app/utils';

export const accessGuard: CanActivateFn = (route, state) => {
  const store = inject(Store);
  const authDrawerService = inject(AuthDrawerService);
  const router = inject(Router);

  const user = store.selectSignal(AuthSelectors.selectUser)();

  if (hasAccess(declaredAccess(route.data), user)) {
    return true;
  }

  if (!user) {
    // Send them home with the login drawer open over it, rather than to a
    // standalone page, so they don't lose their place.
    authDrawerService.openLogin();
    return router.createUrlTree(['/']);
  }

  const [, entity, action] = state.url.split('/');
  const pageHeading = ['add', 'edit'].includes(action)
    ? startCase(`${action} ${entity}`)
    : '';

  store.dispatch(NavActions.pageAccessDenied({ pageHeading }));
  return false;
};
