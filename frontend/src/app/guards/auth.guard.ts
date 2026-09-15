import { Store } from '@ngrx/store';
import { startCase } from 'lodash';

import { Injectable, inject } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  CanActivate,
  type CanActivateFn,
  Router,
  UrlTree,
} from '@angular/router';

import { AuthDrawerService, ClerkService } from '@app/services';
import { AuthSelectors } from '@app/store/auth';
import { NavActions } from '@app/store/nav';

@Injectable({
  providedIn: 'root',
})
export class AuthGuard implements CanActivate {
  constructor(
    private readonly authDrawerService: AuthDrawerService,
    private readonly clerkService: ClerkService,
    private readonly router: Router,
    private readonly store: Store,
  ) {}

  public canActivate(route: ActivatedRouteSnapshot): boolean | UrlTree {
    if (!this.clerkService.isLoggedIn()) {
      // Send them home with the login drawer open over it, rather than to a
      // standalone page, so they don't lose their place.
      this.authDrawerService.openLogin();
      return this.router.createUrlTree(['/']);
    }

    if (this.store.selectSignal(AuthSelectors.selectIsAdmin)()) {
      return true;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [, entity, action] = ((route as any)._routerState?.url ?? '').split('/');

    const pageHeading = ['add', 'edit'].includes(action)
      ? startCase(`${action} ${entity}`)
      : '';

    this.store.dispatch(NavActions.pageAccessDenied({ pageHeading }));
    return false;
  }
}

export const loggedInGuard: CanActivateFn = () => {
  const authDrawerService = inject(AuthDrawerService);
  const clerkService = inject(ClerkService);
  const router = inject(Router);

  if (clerkService.isLoggedIn()) {
    return true;
  }

  authDrawerService.openLogin();
  return router.createUrlTree(['/']);
};
