import { Store } from '@ngrx/store';
import { startCase } from 'lodash-es';

import { inject } from '@angular/core';
import { type CanActivateFn, Router } from '@angular/router';

import { AuthDrawerService, ClerkService, UserService } from '@app/services';
import { AuthSelectors } from '@app/store/auth';
import { NavActions } from '@app/store/nav';
import { declaredAccess, hasAccess } from '@app/utils';

export const accessGuard: CanActivateFn = async (route, state) => {
  const store = inject(Store);
  const authDrawerService = inject(AuthDrawerService);
  const clerk = inject(ClerkService);
  const router = inject(Router);
  const userService = inject(UserService);

  // Who someone is comes from their record, which may still be on its way at first load.
  // A Clerk that fails to load leaves the visitor logged out, which the checks below handle
  await clerk.load().catch(() => undefined);
  if (clerk.isLoggedIn() && !userService.user()) {
    await userService.load();
  }
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
