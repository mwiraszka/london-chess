import { DrawerComponent, ToastService } from '@eagami/ui';

import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { AUTH_DRAWER_BOTTOM_SHEET_MAX_WIDTH } from '@app/constants/auth';
import { ApiService } from '@app/services/api.service';
import { AuthDrawerService } from '@app/services/auth-drawer.service';
import { ClerkService } from '@app/services/clerk.service';
import { UserService } from '@app/services/user.service';
import { query, queryTextContent } from '@app/utils';

import { AuthDrawerComponent } from './auth-drawer.component';

describe('AuthDrawerComponent', () => {
  let fixture: ComponentFixture<AuthDrawerComponent>;
  let authDrawer: AuthDrawerService;

  const drawer = (): DrawerComponent =>
    query(fixture.debugElement, 'ea-drawer').componentInstance;

  const create = (): void => {
    fixture = TestBed.createComponent(AuthDrawerComponent);
    fixture.detectChanges();
  };

  beforeEach(async () => {
    // jsdom has no modal dialog support for the drawer to open with
    Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
      configurable: true,
      value: vi.fn(),
    });

    await TestBed.configureTestingModule({
      imports: [AuthDrawerComponent],
      providers: [
        provideRouter([]),
        { provide: ApiService, useValue: { post: vi.fn() } },
        {
          provide: ClerkService,
          useValue: { isLoggedIn: signal(false), user: signal(null), logOut: vi.fn() },
        },
        { provide: ToastService, useValue: { show: vi.fn() } },
        { provide: UserService, useValue: { load: vi.fn(), user: signal(null) } },
      ],
    }).compileComponents();

    authDrawer = TestBed.inject(AuthDrawerService);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal');
  });

  it('should render no form while closed', () => {
    create();

    expect(drawer().open()).toBe(false);
    expect(query(fixture.debugElement, 'lcc-login-form')).toBeFalsy();
  });

  it.each([
    ['login', 'lcc-login-form'],
    ['create-account', 'lcc-create-account-form'],
    ['forgot-password', 'lcc-forgot-password-form'],
  ] as const)('should show the %s form while open', (mode, selector) => {
    create();

    authDrawer.open.set(true);
    authDrawer.setMode(mode);
    fixture.detectChanges();

    expect(query(fixture.debugElement, selector)).toBeTruthy();
  });

  it('should give each mode a different title', () => {
    create();
    authDrawer.open.set(true);

    const titles = (['login', 'create-account', 'forgot-password'] as const).map(mode => {
      authDrawer.setMode(mode);
      fixture.detectChanges();
      return queryTextContent(fixture.debugElement, 'h2');
    });

    expect(new Set(titles).size).toBe(3);
  });

  it('should open as a right side panel on wide screens', () => {
    vi.stubGlobal('innerWidth', AUTH_DRAWER_BOTTOM_SHEET_MAX_WIDTH + 1);

    create();

    expect(drawer().position()).toBe('right');
    expect(drawer().size()).toBe('md');
  });

  it('should rise as a full bottom sheet once the screen narrows to phone width', () => {
    vi.stubGlobal('innerWidth', AUTH_DRAWER_BOTTOM_SHEET_MAX_WIDTH + 1);
    create();

    vi.stubGlobal('innerWidth', AUTH_DRAWER_BOTTOM_SHEET_MAX_WIDTH);
    window.dispatchEvent(new Event('resize'));
    fixture.detectChanges();

    expect(drawer().position()).toBe('bottom');
    expect(drawer().size()).toBe('full');
  });

  it('should reset to log in when the drawer closes itself', () => {
    authDrawer.open.set(true);
    authDrawer.setMode('forgot-password');
    create();

    query(fixture.debugElement, 'ea-drawer').triggerEventHandler('openChange', false);

    expect(authDrawer.open()).toBe(false);
    expect(authDrawer.mode()).toBe('login');
  });

  it('should keep the mode when the drawer opens itself', () => {
    authDrawer.setMode('create-account');
    create();

    query(fixture.debugElement, 'ea-drawer').triggerEventHandler('openChange', true);

    expect(authDrawer.open()).toBe(true);
    expect(authDrawer.mode()).toBe('create-account');
  });
});
