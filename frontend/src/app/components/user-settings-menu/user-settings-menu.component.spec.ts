import { AvatarComponent, ToastService } from '@eagami/ui';
import { MockStore, provideMockStore } from '@ngrx/store/testing';

import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';

import { TooltipDirective } from '@app/directives/tooltip.directive';
import { User } from '@app/models';
import { AuthDrawerService, ClerkService } from '@app/services';
import { AppActions, AppSelectors } from '@app/store/app';
import { AuthSelectors } from '@app/store/auth';
import { query } from '@app/utils';

import { UserSettingsMenuComponent } from './user-settings-menu.component';

interface FakeClerkUser {
  hasImage: boolean;
  imageUrl: string;
  firstName: string | null;
  lastName: string | null;
}

describe('UserSettingsMenuComponent', () => {
  let fixture: ComponentFixture<UserSettingsMenuComponent>;
  let store: MockStore;

  let closeSpy: Mock;
  let dispatchSpy: MockInstance;
  let logOutSpy: Mock;
  let navigateSpy: Mock;
  let openLoginSpy: Mock;
  let toastSpy: Mock;

  const clerkUser = signal<FakeClerkUser | null>(null);

  const mockUser: User = {
    id: '123',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    isAdmin: true,
  };

  const create = (): void => {
    fixture = TestBed.createComponent(UserSettingsMenuComponent);
    fixture.componentInstance.close.subscribe(closeSpy);
    fixture.detectChanges();
  };

  const click = (selector: string): void => {
    query(fixture.debugElement, `${selector} a`).nativeElement.click();
  };

  const toggle = (selector: string): void => {
    query(fixture.debugElement, `${selector} lcc-toggle-switch`).triggerEventHandler(
      'toggle',
      true,
    );
  };

  const tooltipOf = (selector: string) =>
    query(fixture.debugElement, selector).injector.get(TooltipDirective).tooltip();

  beforeEach(async () => {
    clerkUser.set(null);
    closeSpy = vi.fn();
    logOutSpy = vi.fn().mockResolvedValue(undefined);
    navigateSpy = vi.fn().mockResolvedValue(true);
    openLoginSpy = vi.fn();
    toastSpy = vi.fn();

    await TestBed.configureTestingModule({
      imports: [UserSettingsMenuComponent],
      providers: [
        provideMockStore(),
        { provide: AuthDrawerService, useValue: { openLogin: openLoginSpy } },
        { provide: ClerkService, useValue: { user: clerkUser, logOut: logOutSpy } },
        { provide: Router, useValue: { navigate: navigateSpy } },
        { provide: ToastService, useValue: { show: toastSpy } },
      ],
    }).compileComponents();

    store = TestBed.inject(MockStore);
    store.overrideSelector(AuthSelectors.selectUser, mockUser);
    store.overrideSelector(AppSelectors.selectIsSafeMode, true);
    store.overrideSelector(AppSelectors.selectIsDarkMode, false);
    store.overrideSelector(AppSelectors.selectIsWideView, false);
    store.overrideSelector(AppSelectors.selectIsDesktopView, false);
    dispatchSpy = vi.spyOn(store, 'dispatch');
  });

  describe('logged in', () => {
    beforeEach(() => {
      create();
    });

    it('should show the user info, account, safe mode and log out items', () => {
      expect(
        query(fixture.debugElement, '.user-name').nativeElement.textContent,
      ).toContain('John Doe');
      expect(
        query(fixture.debugElement, '.user-email').nativeElement.textContent,
      ).toContain('john.doe@example.com');
      expect(query(fixture.debugElement, '.account')).toBeTruthy();
      expect(query(fixture.debugElement, '.safe-mode-toggle')).toBeTruthy();
      expect(query(fixture.debugElement, '.admin-logout')).toBeTruthy();
      expect(query(fixture.debugElement, '.login')).toBeFalsy();
    });

    it('should not show the desktop view toggle on non-touch devices', () => {
      expect(query(fixture.debugElement, '.desktop-view-toggle')).toBeFalsy();
    });

    it('should navigate to the account page and close the menu', () => {
      click('.account');

      expect(navigateSpy).toHaveBeenCalledWith(['account']);
      expect(closeSpy).toHaveBeenCalled();
    });

    it('should navigate to the website changelog page and close the menu', () => {
      click('.website-changelog');

      expect(navigateSpy).toHaveBeenCalledWith(['website-changelog']);
      expect(closeSpy).toHaveBeenCalled();
    });

    it.each([
      ['.theme-toggle', AppActions.themeToggled()],
      ['.wide-view-toggle', AppActions.wideViewToggled()],
      ['.safe-mode-toggle', AppActions.safeModeToggled()],
    ])('should dispatch the toggle action for %s', (selector, action) => {
      toggle(selector);

      expect(dispatchSpy).toHaveBeenCalledWith(action);
    });

    it('should close the menu, log out via Clerk and confirm it', async () => {
      await fixture.componentInstance.onLogout();

      expect(closeSpy).toHaveBeenCalled();
      expect(logOutSpy).toHaveBeenCalled();
      expect(toastSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ variant: 'success' }),
      );
    });

    it('should log out from the menu item', () => {
      click('.admin-logout');

      expect(logOutSpy).toHaveBeenCalled();
    });

    it('should not show tooltips for a name and email that fit', () => {
      expect(tooltipOf('.user-name')).toBeNull();
      expect(tooltipOf('.user-email')).toBeNull();
    });
  });

  describe('logged out', () => {
    beforeEach(() => {
      store.overrideSelector(AuthSelectors.selectUser, null);
      create();
    });

    it('should show log in and view toggles but no account items', () => {
      expect(query(fixture.debugElement, '.login')).toBeTruthy();
      expect(query(fixture.debugElement, '.website-changelog')).toBeTruthy();
      expect(query(fixture.debugElement, '.theme-toggle')).toBeTruthy();
      expect(query(fixture.debugElement, '.wide-view-toggle')).toBeTruthy();
      expect(query(fixture.debugElement, '.user-info')).toBeFalsy();
      expect(query(fixture.debugElement, '.account')).toBeFalsy();
      expect(query(fixture.debugElement, '.safe-mode-toggle')).toBeFalsy();
      expect(query(fixture.debugElement, '.admin-logout')).toBeFalsy();
    });

    it('should open the login drawer and close the menu', () => {
      click('.login');

      expect(openLoginSpy).toHaveBeenCalled();
      expect(closeSpy).toHaveBeenCalled();
    });
  });

  describe('avatar', () => {
    it('should show the Clerk image and the initials', () => {
      clerkUser.set({
        hasImage: true,
        imageUrl: 'https://img.clerk.com/a',
        firstName: 'john',
        lastName: 'doe',
      });

      create();

      const avatar: AvatarComponent = query(
        fixture.debugElement,
        'ea-avatar',
      ).componentInstance;
      expect(avatar.src()).toBe('https://img.clerk.com/a');
      expect(avatar.initials()).toBe('JD');
    });

    it('should show no image or initials without them', () => {
      clerkUser.set({
        hasImage: false,
        imageUrl: 'https://img.clerk.com/default',
        firstName: null,
        lastName: null,
      });

      create();

      const avatar: AvatarComponent = query(
        fixture.debugElement,
        'ea-avatar',
      ).componentInstance;
      expect(avatar.src()).toBeUndefined();
      expect(avatar.initials()).toBeUndefined();
    });
  });

  it('should warn about personal information while safe mode is off', () => {
    store.overrideSelector(AppSelectors.selectIsSafeMode, false);
    create();

    query(fixture.debugElement, '.safe-mode-toggle .toggle-icon').triggerEventHandler(
      'mouseenter',
      new MouseEvent('mouseenter'),
    );
    fixture.detectChanges();

    expect(
      document.querySelector('.cdk-overlay-container .safe-mode-warning-tooltip'),
    ).toBeTruthy();
  });

  it('should show the full name and email in tooltips when they are truncated', () => {
    vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockReturnValue(40);

    create();
    fixture.detectChanges();

    expect(tooltipOf('.user-name')).toBe('John Doe');
    expect(tooltipOf('.user-email')).toBe('john.doe@example.com');
  });

  it('should offer a desktop view toggle on touch devices', () => {
    const coarsePointer: MediaQueryList = {
      matches: true,
      media: '(pointer: coarse)',
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    };
    vi.spyOn(window, 'matchMedia').mockReturnValue(coarsePointer);
    create();

    toggle('.desktop-view-toggle');

    expect(dispatchSpy).toHaveBeenCalledWith(AppActions.desktopViewToggled());
  });
});
