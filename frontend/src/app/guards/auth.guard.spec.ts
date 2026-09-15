import { MockStore, provideMockStore } from '@ngrx/store/testing';

import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router } from '@angular/router';

import { AuthDrawerService, ClerkService } from '@app/services';
import { AuthSelectors } from '@app/store/auth';
import { NavActions } from '@app/store/nav';

import { AuthGuard } from './auth.guard';

describe('AuthGuard', () => {
  let guard: AuthGuard;
  let store: MockStore;
  let authDrawerService: AuthDrawerService;

  let dispatchSpy: MockInstance;
  let openLoginSpy: MockInstance;

  const isLoggedIn = vi.fn();

  const mockRoute = (url: string): ActivatedRouteSnapshot =>
    Object.assign(new ActivatedRouteSnapshot(), { _routerState: { url } });

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AuthGuard,
        { provide: ClerkService, useValue: { isLoggedIn } },
        provideMockStore({
          selectors: [{ selector: AuthSelectors.selectIsAdmin, value: false }],
        }),
      ],
    });

    guard = TestBed.inject(AuthGuard);
    store = TestBed.inject(MockStore);
    authDrawerService = TestBed.inject(AuthDrawerService);

    dispatchSpy = vi.spyOn(store, 'dispatch');
    openLoginSpy = vi.spyOn(authDrawerService, 'openLogin');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should open the login drawer and redirect home when logged out', () => {
    isLoggedIn.mockReturnValue(false);
    const router = TestBed.inject(Router);

    const result = guard.canActivate(mockRoute('/article/add'));

    expect(openLoginSpy).toHaveBeenCalled();
    expect(result).toEqual(router.createUrlTree(['/']));
  });

  it('should allow navigation for a logged-in admin', () => {
    isLoggedIn.mockReturnValue(true);
    store.overrideSelector(AuthSelectors.selectIsAdmin, true);
    store.refreshState();

    const result = guard.canActivate(mockRoute('/article/add'));

    expect(result).toBe(true);
    expect(dispatchSpy).not.toHaveBeenCalled();
  });

  it('should block a logged-in non-admin and dispatch pageAccessDenied', () => {
    isLoggedIn.mockReturnValue(true);
    store.overrideSelector(AuthSelectors.selectIsAdmin, false);
    store.refreshState();

    const result = guard.canActivate(mockRoute('/article/add'));

    expect(result).toBe(false);
    expect(dispatchSpy).toHaveBeenCalledWith(
      NavActions.pageAccessDenied({ pageHeading: 'Add Article' }),
    );
  });
});
