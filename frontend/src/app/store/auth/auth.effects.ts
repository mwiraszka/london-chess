import { Actions, createEffect, ofType } from '@ngrx/effects';
import { filter, tap } from 'rxjs/operators';

import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';

import { hasAccess, requiredAccess } from '@app/utils';

import * as AuthActions from './auth.actions';

@Injectable()
export class AuthEffects {
  private readonly actions$ = inject(Actions);
  private readonly router = inject(Router);

  // Guards run on navigation, so a session ending while a protected page is
  // already open has to be caught here
  leaveProtectedRouteOnAccessLoss$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(AuthActions.userChanged),
        filter(
          ({ user }) =>
            !hasAccess(requiredAccess(this.router.routerState.snapshot), user),
        ),
        tap(() => void this.router.navigate(['/'])),
      ),
    { dispatch: false },
  );
}
