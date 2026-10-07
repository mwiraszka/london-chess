import { Actions } from '@ngrx/effects';
import { Action } from '@ngrx/store';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { ReplaySubject } from 'rxjs';

import { TestBed } from '@angular/core/testing';
import { Data, Router } from '@angular/router';

import { User } from '@app/models';
import { AppActions } from '@app/store/app';

import * as AuthActions from './auth.actions';
import { AuthEffects } from './auth.effects';
import * as AuthSelectors from './auth.selectors';

interface MockRoute {
  data: Data;
  firstChild: MockRoute | null;
}

describe('AuthEffects', () => {
  let actions$: ReplaySubject<Action>;
  let effects: AuthEffects;
  let store: MockStore;

  const navigate = vi.fn();
  const routerState = { snapshot: { root: { data: {}, firstChild: null } as MockRoute } };

  const admin: User = {
    id: 'user123',
    firstName: 'Ada',
    lastName: 'Byron',
    email: 'ada@example.com',
    isAdmin: true,
    memberNumber: null,
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
        provideMockStore(),
      ],
    });

    effects = TestBed.inject(AuthEffects);
    store = TestBed.inject(MockStore);
  });

  // The store already holds the user an action announces by the time the effect runs
  const storeUser = (user: User | null, isAdmin = !!user?.isAdmin): void => {
    store.overrideSelector(AuthSelectors.selectUser, user);
    store.overrideSelector(AuthSelectors.selectIsAdmin, isAdmin);
    store.refreshState();
  };

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should leave an admin route when the session ends', () => {
    routerState.snapshot = { root: routeRequiring('admin') };
    effects.leaveProtectedRouteOnAccessLoss$.subscribe();

    storeUser(null);
    actions$.next(AuthActions.userChanged({ user: null }));

    expect(navigate).toHaveBeenCalledWith(['/']);
  });

  it('should leave an admin route when the user is no longer an admin', () => {
    routerState.snapshot = { root: routeRequiring('admin') };
    effects.leaveProtectedRouteOnAccessLoss$.subscribe();

    storeUser(nonAdmin);
    actions$.next(AuthActions.userChanged({ user: nonAdmin }));

    expect(navigate).toHaveBeenCalledWith(['/']);
  });

  it('should leave a member route when the session ends', () => {
    routerState.snapshot = { root: routeRequiring('member') };
    effects.leaveProtectedRouteOnAccessLoss$.subscribe();

    storeUser(null);
    actions$.next(AuthActions.userChanged({ user: null }));

    expect(navigate).toHaveBeenCalledWith(['/']);
  });

  it('should stay on an admin route while the user is still an admin', () => {
    routerState.snapshot = { root: routeRequiring('admin') };
    effects.leaveProtectedRouteOnAccessLoss$.subscribe();

    storeUser(admin);
    actions$.next(AuthActions.userChanged({ user: admin }));

    expect(navigate).not.toHaveBeenCalled();
  });

  it('should leave an admin route when an admin switches their controls off', () => {
    routerState.snapshot = { root: routeRequiring('admin') };
    effects.leaveProtectedRouteOnAccessLoss$.subscribe();

    storeUser(admin, false);
    actions$.next(AppActions.adminControlsToggled());

    expect(navigate).toHaveBeenCalledWith(['/']);
  });

  it('should stay on a member route when an admin switches their controls off', () => {
    routerState.snapshot = { root: routeRequiring('member') };
    effects.leaveProtectedRouteOnAccessLoss$.subscribe();

    storeUser(admin, false);
    actions$.next(AppActions.adminControlsToggled());

    expect(navigate).not.toHaveBeenCalled();
  });

  it('should stay on a public route when the session ends', () => {
    effects.leaveProtectedRouteOnAccessLoss$.subscribe();

    storeUser(null);
    actions$.next(AuthActions.userChanged({ user: null }));

    expect(navigate).not.toHaveBeenCalled();
  });
});
