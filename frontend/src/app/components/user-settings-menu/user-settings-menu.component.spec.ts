import { MockStore, provideMockStore } from '@ngrx/store/testing';

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { User } from '@app/models';
import { AuthDrawerService, ClerkService } from '@app/services';
import { AppActions, AppSelectors } from '@app/store/app';
import { AuthSelectors } from '@app/store/auth';
import { query, queryTextContent } from '@app/utils';

import { UserSettingsMenuComponent } from './user-settings-menu.component';

describe('UserSettingsMenuComponent', () => {
  let fixture: ComponentFixture<UserSettingsMenuComponent>;
  let component: UserSettingsMenuComponent;

  let store: MockStore;

  let closeSpy: MockInstance;
  let dispatchSpy: MockInstance;
  let logOutSpy: Mock;
  let openLoginSpy: MockInstance;
  let routerSpy: MockInstance;

  const mockUser: User = {
    id: '123',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    isAdmin: true,
  };

  beforeEach(async () => {
    logOutSpy = vi.fn().mockResolvedValue(undefined);

    await TestBed.configureTestingModule({
      imports: [UserSettingsMenuComponent],
      providers: [
        provideMockStore(),
        { provide: AuthDrawerService, useValue: { openLogin: vi.fn() } },
        { provide: ClerkService, useValue: { user: () => null, logOut: logOutSpy } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(UserSettingsMenuComponent);
    component = fixture.componentInstance;

    store = TestBed.inject(MockStore);

    store.overrideSelector(AuthSelectors.selectUser, mockUser);
    store.overrideSelector(AppSelectors.selectIsSafeMode, true);
    store.overrideSelector(AppSelectors.selectIsDarkMode, false);
    store.overrideSelector(AppSelectors.selectIsWideView, false);
    store.overrideSelector(AppSelectors.selectIsDesktopView, false);

    openLoginSpy = vi.spyOn(TestBed.inject(AuthDrawerService), 'openLogin');
    closeSpy = vi.spyOn(component.close, 'emit');
    dispatchSpy = vi.spyOn(store, 'dispatch');
    // @ts-expect-error Private class member
    routerSpy = vi.spyOn(component.router, 'navigate');

    fixture.detectChanges();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show log in, whats-changed, and view toggles but no account items when logged out', () => {
    store.overrideSelector(AuthSelectors.selectUser, null);
    store.refreshState();

    fixture.detectChanges();

    expect(query(fixture.debugElement, '.login')).toBeTruthy();
    expect(query(fixture.debugElement, '.whats-changed')).toBeTruthy();
    expect(query(fixture.debugElement, '.theme-toggle')).toBeTruthy();
    expect(query(fixture.debugElement, '.wide-view-toggle')).toBeTruthy();
    expect(query(fixture.debugElement, '.user-info')).toBeFalsy();
    expect(query(fixture.debugElement, '.account')).toBeFalsy();
    expect(query(fixture.debugElement, '.safe-mode-toggle')).toBeFalsy();
    expect(query(fixture.debugElement, '.admin-logout')).toBeFalsy();
  });

  it('should open the login drawer and close the menu', () => {
    component.onLogin();

    expect(openLoginSpy).toHaveBeenCalled();
    expect(closeSpy).toHaveBeenCalled();
  });

  it('should show the user info, links, toggles, and log out items', () => {
    expect(queryTextContent(fixture.debugElement, '.user-name')).toContain('John Doe');
    expect(queryTextContent(fixture.debugElement, '.user-email')).toContain(
      'john.doe@example.com',
    );
    expect(query(fixture.debugElement, '.account')).toBeTruthy();
    expect(query(fixture.debugElement, '.whats-changed')).toBeTruthy();
    expect(query(fixture.debugElement, '.theme-toggle')).toBeTruthy();
    expect(query(fixture.debugElement, '.wide-view-toggle')).toBeTruthy();
    expect(query(fixture.debugElement, '.safe-mode-toggle')).toBeTruthy();
    expect(query(fixture.debugElement, '.admin-logout')).toBeTruthy();
  });

  it('should not show the desktop view toggle on non-touch devices', () => {
    expect(query(fixture.debugElement, '.desktop-view-toggle')).toBeFalsy();
  });

  it('should dispatch themeToggled', () => {
    component.onToggleTheme();

    expect(dispatchSpy).toHaveBeenCalledWith(AppActions.themeToggled());
  });

  it('should dispatch wideViewToggled', () => {
    component.onToggleWideView();

    expect(dispatchSpy).toHaveBeenCalledWith(AppActions.wideViewToggled());
  });

  it('should dispatch desktopViewToggled', () => {
    component.onToggleDesktopView();

    expect(dispatchSpy).toHaveBeenCalledWith(AppActions.desktopViewToggled());
  });

  it('should navigate to the whats-changed page and close the menu', () => {
    component.onWhatsChanged();

    expect(routerSpy).toHaveBeenCalledWith(['whats-changed']);
    expect(closeSpy).toHaveBeenCalled();
  });

  it('should dispatch safeModeToggled', () => {
    component.onToggleSafeMode();

    expect(dispatchSpy).toHaveBeenCalledWith(AppActions.safeModeToggled());
  });

  it('should navigate to the account page and close the menu', () => {
    component.onAccount();

    expect(routerSpy).toHaveBeenCalledWith(['account']);
    expect(closeSpy).toHaveBeenCalled();
  });

  it('should log out via Clerk and close the menu', async () => {
    await component.onLogout();

    expect(logOutSpy).toHaveBeenCalled();
    expect(closeSpy).toHaveBeenCalled();
  });
});
