import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { of } from 'rxjs';

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, RouterModule } from '@angular/router';

import { User } from '@app/models';
import { ClerkService } from '@app/services';
import { AppSelectors } from '@app/store/app';
import { AuthSelectors } from '@app/store/auth';
import { query } from '@app/utils';

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
    store.overrideSelector(AppSelectors.selectIsWideView, false);
    store.overrideSelector(AuthSelectors.selectUser, null);

    fixture.detectChanges();
  });

  afterEach(() => {
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
