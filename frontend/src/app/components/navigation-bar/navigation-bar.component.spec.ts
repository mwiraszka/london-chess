import { PopoverComponent, TooltipDirective } from '@eagami/ui';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { of } from 'rxjs';

import { DebugElement, TemplateRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, RouterModule } from '@angular/router';

import { User } from '@app/models';
import { ClerkService } from '@app/services';
import { AppSelectors } from '@app/store/app';
import { AuthSelectors } from '@app/store/auth';
import { query, queryAll } from '@app/utils';

import { NavigationBarComponent } from './navigation-bar.component';

describe('NavigationBarComponent', () => {
  let fixture: ComponentFixture<NavigationBarComponent>;
  let component: NavigationBarComponent;

  let store: MockStore;

  const mockUser: User = {
    id: '123',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    isAdmin: true,
    memberNumber: null,
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NavigationBarComponent, RouterModule.forRoot([])],
      providers: [
        provideMockStore(),
        { provide: ClerkService, useValue: { user: () => null } },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: {
                get: (key: string) => (key === 'id' ? '123' : null),
              },
            },
            queryParamMap: of({
              get: (key: string) => (key === 'queryParam' ? 'queryValue' : null),
            }),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(NavigationBarComponent);
    component = fixture.componentInstance;

    store = TestBed.inject(MockStore);

    store.overrideSelector(AppSelectors.selectIsDarkMode, false);
    store.overrideSelector(AppSelectors.selectIsDesktopView, false);
    store.overrideSelector(AppSelectors.selectIsSafeMode, false);
    store.overrideSelector(AppSelectors.selectIsWideView, false);
    store.overrideSelector(AuthSelectors.selectUser, null);

    fixture.detectChanges();
  });

  afterEach(() => {
    store.resetSelectors();
    vi.clearAllMocks();
  });

  describe('navigation links', () => {
    it('should render the correct number of links when screenWidth is above 700px', () => {
      component.screenWidth.set(800);
      fixture.detectChanges();

      const renderedLinks = fixture.nativeElement.querySelectorAll('.nav-link');
      expect(renderedLinks.length).toBe(component.links.length);
    });

    it('should render the correct number of links when screenWidth is below 700px', () => {
      component.screenWidth.set(600);
      fixture.detectChanges();

      const renderedLinks = fixture.nativeElement.querySelectorAll('.nav-link');
      expect(renderedLinks.length).toBe(component.links.length);
    });
  });

  describe('link tooltips', () => {
    const tooltipOf = (index: number): string | TemplateRef<unknown> => {
      const link = queryAll(fixture.debugElement, '.nav-link')[index];
      return link.injector.get(TooltipDirective).eaTooltip();
    };

    it('should name each icon-only link in a tooltip on narrow screens', () => {
      component.screenWidth.set(600);
      fixture.detectChanges();

      expect(tooltipOf(0)).toBe(component.links[0].text);
    });

    it('should show no tooltips once the link text is visible', () => {
      component.screenWidth.set(1000);
      fixture.detectChanges();

      expect(tooltipOf(0)).toBe('');
    });
  });

  describe('settings menu', () => {
    const trigger = (): HTMLButtonElement =>
      query(fixture.debugElement, '.avatar-button').nativeElement;
    const popover = (): PopoverComponent =>
      query(fixture.debugElement, 'ea-popover').componentInstance;
    const menu = (): DebugElement =>
      query(fixture.debugElement, 'lcc-user-settings-menu');

    it('should start closed', () => {
      expect(popover().open()).toBe(false);
      expect(trigger().getAttribute('aria-expanded')).toBe('false');
      expect(menu()).toBeFalsy();
    });

    describe('once opened from its trigger', () => {
      beforeEach(() => {
        trigger().click();
        fixture.detectChanges();
      });

      it('should show the menu below the end of the trigger', () => {
        expect(popover().open()).toBe(true);
        expect(popover().placement()).toBe('bottom-end');
        expect(popover().anchor()).toBe(trigger());
        expect(trigger().getAttribute('aria-expanded')).toBe('true');
        expect(menu()).toBeTruthy();
      });

      it('should close again from the trigger', () => {
        trigger().click();
        fixture.detectChanges();

        expect(popover().open()).toBe(false);
        expect(menu()).toBeFalsy();
      });

      it('should close on Escape', () => {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
        fixture.detectChanges();

        expect(popover().open()).toBe(false);
      });

      it('should close on a click outside it', () => {
        document.body.click();
        fixture.detectChanges();

        expect(popover().open()).toBe(false);
      });

      it('should close once the menu has acted on a choice', () => {
        menu().triggerEventHandler('close');
        fixture.detectChanges();

        expect(popover().open()).toBe(false);
      });
    });
  });

  describe('account controls', () => {
    it('should show the menu trigger with a settings icon when logged out', () => {
      expect(query(fixture.debugElement, '.avatar-button')).toBeTruthy();
      expect(query(fixture.debugElement, '.menu-icon')).toBeTruthy();
      expect(query(fixture.debugElement, 'ea-avatar')).toBeFalsy();
    });

    it('should show the menu trigger with the avatar when logged in', () => {
      store.overrideSelector(AuthSelectors.selectUser, mockUser);
      store.refreshState();

      fixture.detectChanges();

      expect(query(fixture.debugElement, '.avatar-button')).toBeTruthy();
      expect(query(fixture.debugElement, 'ea-avatar')).toBeTruthy();
      expect(query(fixture.debugElement, '.menu-icon')).toBeFalsy();
    });
  });
});
