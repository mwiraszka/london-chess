import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { filter, tap } from 'rxjs/operators';

import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';

import * as AppActions from '@app/store/app/app.actions';
import { hasAccess, requiredAccess } from '@app/utils';

import * as AuthActions from './auth.actions';
import * as AuthSelectors from './auth.selectors';

@Injectable()
export class AuthEffects {
  private readonly actions$ = inject(Actions);
  private readonly router = inject(Router);
  private readonly store = inject(Store);

  // Guards run on navigation, so a session ending, or an admin switching their controls
  // off, while a protected page is already open has to be caught here
  leaveProtectedRouteOnAccessLoss$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(AuthActions.userChanged, AppActions.adminControlsToggled),
        filter(
          () =>
            !hasAccess(
              requiredAccess(this.router.routerState.snapshot),
              this.store.selectSignal(AuthSelectors.selectUser)(),
              this.store.selectSignal(AuthSelectors.selectIsAdmin)(),
            ),
        ),
        tap(() => void this.router.navigate(['/'])),
      ),
    { dispatch: false },
  );
}
