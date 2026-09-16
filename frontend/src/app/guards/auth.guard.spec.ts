import { MockStore, provideMockStore } from '@ngrx/store/testing';

import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot } from '@angular/router';

import { RouteAccess, User } from '@app/models';
import { AuthDrawerService } from '@app/services';
import { AuthSelectors } from '@app/store/auth';
import { NavActions } from '@app/store/nav';

import { accessGuard } from './auth.guard';

describe('accessGuard', () => {
  let store: MockStore;
  let authDrawerService: AuthDrawerService;

  let dispatchSpy: MockInstance;
  let openLoginSpy: MockInstance;

  const admin: User = {
    id: 'user123',
    firstName: 'Ada',
    lastName: 'Byron',
    email: 'ada@example.com',
    isAdmin: true,
  };
  const nonAdmin: User = { ...admin, isAdmin: false };

  const mockRoute = (access?: RouteAccess): ActivatedRouteSnapshot =>
    Object.assign(new ActivatedRouteSnapshot(), { data: access ? { access } : {} });

  const mockState = (url: string): RouterStateSnapshot =>
    ({ url, root: mockRoute(), toString: () => url }) as RouterStateSnapshot;

  const runGuard = (access: RouteAccess | undefined, url = '/article/add') =>
    TestBed.runInInjectionContext(() => accessGuard(mockRoute(access), mockState(url)));

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideMockStore({
          selectors: [{ selector: AuthSelectors.selectUser, value: null }],
        }),
      ],
    });

    store = TestBed.inject(MockStore);
    authDrawerService = TestBed.inject(AuthDrawerService);

    dispatchSpy = vi.spyOn(store, 'dispatch');
    openLoginSpy = vi.spyOn(authDrawerService, 'openLogin');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should allow navigation to a route that requires no access', () => {
    const result = runGuard(undefined, '/news');

    expect(result).toBe(true);
    expect(openLoginSpy).not.toHaveBeenCalled();
  });

  it('should open the login drawer and redirect home when logged out', () => {
    const router = TestBed.inject(Router);

    const result = runGuard('admin');

    expect(openLoginSpy).toHaveBeenCalled();
    expect(result).toEqual(router.createUrlTree(['/']));
  });

  it('should allow a logged-in admin onto an admin route', () => {
    store.overrideSelector(AuthSelectors.selectUser, admin);
    store.refreshState();

    const result = runGuard('admin');

    expect(result).toBe(true);
    expect(dispatchSpy).not.toHaveBeenCalled();
  });

  it('should allow any logged-in user onto a member route', () => {
    store.overrideSelector(AuthSelectors.selectUser, nonAdmin);
    store.refreshState();

    const result = runGuard('member', '/account/profile');

    expect(result).toBe(true);
    expect(dispatchSpy).not.toHaveBeenCalled();
  });

  it('should block a logged-in non-admin and dispatch pageAccessDenied', () => {
    store.overrideSelector(AuthSelectors.selectUser, nonAdmin);
    store.refreshState();

    const result = runGuard('admin');

    expect(result).toBe(false);
    expect(dispatchSpy).toHaveBeenCalledWith(
      NavActions.pageAccessDenied({ pageHeading: 'Add Article' }),
    );
  });
});
