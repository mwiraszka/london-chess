import { MockStore, provideMockStore } from '@ngrx/store/testing';

import { WritableSignal, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot } from '@angular/router';

import { RouteAccess, User, UserRecord } from '@app/models';
import { AuthDrawerService, ClerkService, UserService } from '@app/services';
import { AuthSelectors } from '@app/store/auth';
import { NavActions } from '@app/store/nav';

import { accessGuard } from './auth.guard';

describe('accessGuard', () => {
  let store: MockStore;
  let authDrawerService: AuthDrawerService;

  let dispatchSpy: MockInstance;
  let openLoginSpy: MockInstance;
  let isLoggedIn: WritableSignal<boolean>;
  let record: WritableSignal<UserRecord | null>;
  let load: Mock;
  let loadClerk: Mock;

  const admin: User = {
    id: 'user123',
    firstName: 'Ada',
    lastName: 'Byron',
    email: 'ada@example.com',
    isAdmin: true,
    memberNumber: null,
  };
  const nonAdmin: User = { ...admin, isAdmin: false };

  const mockRoute = (access?: RouteAccess): ActivatedRouteSnapshot =>
    Object.assign(new ActivatedRouteSnapshot(), { data: access ? { access } : {} });

  const mockState = (url: string): RouterStateSnapshot =>
    ({ url, root: mockRoute(), toString: () => url }) as RouterStateSnapshot;

  const runGuard = (access: RouteAccess | undefined, url = '/article/add') =>
    TestBed.runInInjectionContext(() => accessGuard(mockRoute(access), mockState(url)));

  beforeEach(() => {
    isLoggedIn = signal(false);
    record = signal(null);
    load = vi.fn().mockResolvedValue(undefined);
    loadClerk = vi.fn().mockResolvedValue(undefined);
    TestBed.configureTestingModule({
      providers: [
        provideMockStore({
          selectors: [
            { selector: AuthSelectors.selectUser, value: null },
            { selector: AuthSelectors.selectIsAdmin, value: false },
          ],
        }),
        { provide: ClerkService, useValue: { isLoggedIn, load: loadClerk } },
        { provide: UserService, useValue: { user: record, load } },
      ],
    });

    store = TestBed.inject(MockStore);
    authDrawerService = TestBed.inject(AuthDrawerService);

    dispatchSpy = vi.spyOn(store, 'dispatch');
    openLoginSpy = vi.spyOn(authDrawerService, 'openLogin');
  });

  const logIn = (user: User, isAdmin = user.isAdmin): void => {
    store.overrideSelector(AuthSelectors.selectUser, user);
    store.overrideSelector(AuthSelectors.selectIsAdmin, isAdmin);
  };

  afterEach(() => {
    store.resetSelectors();
    vi.clearAllMocks();
  });

  it('should allow navigation to a route that requires no access', async () => {
    const result = await runGuard(undefined, '/news');

    expect(result).toBe(true);
    expect(openLoginSpy).not.toHaveBeenCalled();
  });

  it('should open the login drawer and redirect home when logged out', async () => {
    const router = TestBed.inject(Router);

    const result = await runGuard('admin');

    expect(openLoginSpy).toHaveBeenCalled();
    expect(result).toEqual(router.createUrlTree(['/']));
  });

  it('should allow a logged-in admin onto an admin route', async () => {
    logIn(admin);
    store.refreshState();

    const result = await runGuard('admin');

    expect(result).toBe(true);
    expect(dispatchSpy).not.toHaveBeenCalled();
  });

  it('should turn an admin with their controls switched off away from an admin route', async () => {
    logIn(admin, false);
    store.refreshState();

    const result = await runGuard('admin');

    expect(result).toBe(false);
  });

  it('should allow any logged-in user onto a member route', async () => {
    logIn(nonAdmin);
    store.refreshState();

    const result = await runGuard('member', '/account/profile');

    expect(result).toBe(true);
    expect(dispatchSpy).not.toHaveBeenCalled();
  });

  it('should block a logged-in non-admin and dispatch pageAccessDenied', async () => {
    logIn(nonAdmin);
    store.refreshState();

    const result = await runGuard('admin');

    expect(result).toBe(false);
    expect(dispatchSpy).toHaveBeenCalledWith(
      NavActions.pageAccessDenied({ pageHeading: 'Add Article' }),
    );
  });

  it('should deny a page without an add or edit heading', async () => {
    logIn(nonAdmin);
    store.refreshState();

    const result = await runGuard('admin', '/members');

    expect(result).toBe(false);
    expect(dispatchSpy).toHaveBeenCalledWith(
      NavActions.pageAccessDenied({ pageHeading: '' }),
    );
  });

  it('should wait for the record of a session that has not loaded it yet', async () => {
    isLoggedIn.set(true);
    load.mockImplementation(async () => {
      logIn(admin);
      store.refreshState();
    });

    const result = await runGuard('admin');

    expect(load).toHaveBeenCalledOnce();
    expect(result).toBe(true);
  });

  it('should wait for Clerk before telling who is logged in', async () => {
    loadClerk.mockImplementation(async () => isLoggedIn.set(true));
    load.mockImplementation(async () => {
      logIn(admin);
      store.refreshState();
    });

    const result = await runGuard('admin');

    expect(loadClerk).toHaveBeenCalledOnce();
    expect(result).toBe(true);
  });

  it('should treat a visitor as logged out when Clerk fails to load', async () => {
    loadClerk.mockRejectedValue(new Error('Clerk is unavailable'));

    const result = await runGuard('admin');

    expect(result).toEqual(TestBed.inject(Router).createUrlTree(['/']));
  });

  it('should not load a record that is already in place again', async () => {
    isLoggedIn.set(true);
    record.set({
      ...admin,
      clerkImageUrl: null,
      avatarUrl: null,
      avatarOriginalUrl: null,
      avatarCropState: null,
      avatarUpdatedAt: null,
      hasTemporaryPassword: false,
      showYearOfBirth: false,
      brand: 'modern',
    });
    logIn(admin);
    store.refreshState();

    await runGuard('admin');

    expect(load).not.toHaveBeenCalled();
  });
});
