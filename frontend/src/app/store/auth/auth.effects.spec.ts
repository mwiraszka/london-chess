import { Actions } from '@ngrx/effects';
import { Action } from '@ngrx/store';
import { ReplaySubject } from 'rxjs';

import { TestBed } from '@angular/core/testing';
import { Data, Router } from '@angular/router';

import { User } from '@app/models';

import * as AuthActions from './auth.actions';
import { AuthEffects } from './auth.effects';

interface MockRoute {
  data: Data;
  firstChild: MockRoute | null;
}

describe('AuthEffects', () => {
  let actions$: ReplaySubject<Action>;
  let effects: AuthEffects;

  const navigate = vi.fn();
  const routerState = { snapshot: { root: { data: {}, firstChild: null } as MockRoute } };

  const admin: User = {
    id: 'user123',
    firstName: 'Ada',
    lastName: 'Byron',
    email: 'ada@example.com',
    isAdmin: true,
  };
  const nonAdmin: User = { ...admin, isAdmin: false };

  const routeRequiring = (access: string): MockRoute => ({
    data: {},
    firstChild: { data: { access }, firstChild: null },
  });

  beforeEach(() => {
    actions$ = new ReplaySubject<Action>(1);
    routerState.snapshot = { root: { data: {}, firstChild: null } };

    TestBed.configureTestingModule({
      providers: [
        AuthEffects,
        { provide: Actions, useValue: actions$ },
        { provide: Router, useValue: { navigate, routerState } },
      ],
    });

    effects = TestBed.inject(AuthEffects);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should leave an admin route when the session ends', () => {
    routerState.snapshot = { root: routeRequiring('admin') };
    effects.leaveProtectedRouteOnAccessLoss$.subscribe();

    actions$.next(AuthActions.userChanged({ user: null }));

    expect(navigate).toHaveBeenCalledWith(['/']);
  });

  it('should leave an admin route when the user is no longer an admin', () => {
    routerState.snapshot = { root: routeRequiring('admin') };
    effects.leaveProtectedRouteOnAccessLoss$.subscribe();

    actions$.next(AuthActions.userChanged({ user: nonAdmin }));

    expect(navigate).toHaveBeenCalledWith(['/']);
  });

  it('should leave a member route when the session ends', () => {
    routerState.snapshot = { root: routeRequiring('member') };
    effects.leaveProtectedRouteOnAccessLoss$.subscribe();

    actions$.next(AuthActions.userChanged({ user: null }));

    expect(navigate).toHaveBeenCalledWith(['/']);
  });

  it('should stay on an admin route while the user is still an admin', () => {
    routerState.snapshot = { root: routeRequiring('admin') };
    effects.leaveProtectedRouteOnAccessLoss$.subscribe();

    actions$.next(AuthActions.userChanged({ user: admin }));

    expect(navigate).not.toHaveBeenCalled();
  });

  it('should stay on a public route when the session ends', () => {
    effects.leaveProtectedRouteOnAccessLoss$.subscribe();

    actions$.next(AuthActions.userChanged({ user: null }));

    expect(navigate).not.toHaveBeenCalled();
  });
});
