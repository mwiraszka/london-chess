import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { Subject, firstValueFrom, take } from 'rxjs';

import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { FooterComponent } from '@app/components/footer/footer.component';
import { HeaderComponent } from '@app/components/header/header.component';
import { NavigationBarComponent } from '@app/components/navigation-bar/navigation-bar.component';
import { UpcomingEventBannerComponent } from '@app/components/upcoming-event-banner/upcoming-event-banner.component';
import { MOCK_EVENTS } from '@app/mocks/events.mock';
import { RoutingService, TouchEventsService } from '@app/services';
import { AppActions, AppSelectors } from '@app/store/app';
import { AuthSelectors } from '@app/store/auth';
import { EventsSelectors } from '@app/store/events';
import { query } from '@app/utils';

import { AppComponent } from './app.component';

describe('AppComponent', () => {
  let fixture: ComponentFixture<AppComponent>;
  let component: AppComponent;

  let mockFragmentSubject: Subject<string | null>;
  let store: MockStore;
  let touchEventsService: TouchEventsService;

  let dispatchSpy: MockInstance;
  let setAttributeSpy: MockInstance;

  beforeEach(async () => {
    mockFragmentSubject = new Subject<string | null>();

    await TestBed.configureTestingModule({
      imports: [
        AppComponent,
        FooterComponent,
        HeaderComponent,
        NavigationBarComponent,
        UpcomingEventBannerComponent,
      ],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideMockStore(),
        provideRouter([]),
        {
          provide: RoutingService,
          useValue: { pageNavigated$: mockFragmentSubject.asObservable() },
        },
        {
          provide: TouchEventsService,
          useValue: { listenForTouchEvents: vi.fn() },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AppComponent);
    component = fixture.componentInstance;

    store = TestBed.inject(MockStore);
    touchEventsService = TestBed.inject(TouchEventsService);

    dispatchSpy = vi.spyOn(store, 'dispatch');
    setAttributeSpy = vi.spyOn(document.body, 'setAttribute');

    store.overrideSelector(AuthSelectors.selectUser, null);
    store.overrideSelector(AppSelectors.selectBannerLastCleared, null);
    store.overrideSelector(AppSelectors.selectIsDarkMode, false);
    store.overrideSelector(AppSelectors.selectIsDesktopView, false);
    store.overrideSelector(AppSelectors.selectIsWideView, false);
    store.overrideSelector(EventsSelectors.selectConcurrentNextEvents, [MOCK_EVENTS[0]]);
    store.overrideSelector(AppSelectors.selectShowUpcomingEventBanner, false);
    store.refreshState();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('initialization', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should scroll to top when navigation occurs without fragment', () => {
      const scrollToSpy = vi.fn();
      component.mainElement = {
        nativeElement: {
          scrollTo: scrollToSpy,
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any;

      component.ngOnInit();
      mockFragmentSubject.next(null);
      fixture.detectChanges();

      expect(scrollToSpy).toHaveBeenCalledWith({ top: 0 });
    });

    it('should not scroll to top when navigation occurs with fragment', () => {
      const scrollToSpy = vi.fn();
      component.mainElement = {
        nativeElement: {
          scrollTo: scrollToSpy,
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any;

      component.ngOnInit();
      mockFragmentSubject.next('some-fragment');
      fixture.detectChanges();

      expect(scrollToSpy).not.toHaveBeenCalled();
    });

    it('should initialize image change and touch event listeners', () => {
      expect(touchEventsService.listenForTouchEvents).toHaveBeenCalled();
    });

    it('should set viewModel$', async () => {
      const vm = await firstValueFrom(component.viewModel$!.pipe(take(1)));

      expect(vm).toStrictEqual({
        bannerLastCleared: null,
        isDarkMode: false,
        isDesktopView: false,
        isWideView: false,
        nextEvents: [MOCK_EVENTS[0]],
        showUpcomingEventBanner: false,
      });
    });

    it('should set data-theme attribute to light when isDarkMode is false', () => {
      expect(setAttributeSpy).toHaveBeenCalledWith('data-theme', 'light');
    });

    it('should set data-theme attribute to dark when isDarkMode is true', () => {
      store.overrideSelector(AppSelectors.selectIsDarkMode, true);
      store.refreshState();

      component.ngOnInit();
      fixture.detectChanges();

      expect(setAttributeSpy).toHaveBeenCalledWith('data-theme', 'dark');
    });

    it('should set data-wide-view attribute to false by default', () => {
      expect(setAttributeSpy).toHaveBeenCalledWith('data-wide-view', 'false');
    });

    it('should set data-wide-view attribute to true when isWideView is true', () => {
      store.overrideSelector(AppSelectors.selectIsWideView, true);
      store.refreshState();

      component.ngOnInit();
      fixture.detectChanges();

      expect(setAttributeSpy).toHaveBeenCalledWith('data-wide-view', 'true');
    });
  });

  describe('onClearBanner', () => {
    it('should dispatch upcomingEventBannerCleared action', () => {
      component.onClearBanner();

      expect(dispatchSpy).toHaveBeenCalledWith(AppActions.upcomingEventBannerCleared());
    });
  });

  describe('template rendering', () => {
    describe('when viewModel$ is undefined', () => {
      it('should not render any page components', () => {
        expect(query(fixture.debugElement, 'lcc-header')).toBeFalsy();
        expect(query(fixture.debugElement, 'lcc-navigation-bar')).toBeFalsy();
        expect(query(fixture.debugElement, 'main[cdkScrollable]')).toBeFalsy();
        expect(query(fixture.debugElement, 'router-outlet')).toBeFalsy();
        expect(query(fixture.debugElement, 'lcc-footer')).toBeFalsy();
        expect(query(fixture.debugElement, 'lcc-pull-to-refresh-indicator')).toBeFalsy();
        expect(query(fixture.debugElement, 'lcc-upcoming-event-banner')).toBeFalsy();
      });
    });

    describe('when viewModel$ is defined', () => {
      beforeEach(() => {
        fixture.detectChanges();
      });

      it('should render all main page components', () => {
        expect(query(fixture.debugElement, 'lcc-header')).toBeTruthy();
        expect(query(fixture.debugElement, 'lcc-navigation-bar')).toBeTruthy();
        expect(query(fixture.debugElement, 'main[cdkScrollable]')).toBeTruthy();
        expect(query(fixture.debugElement, 'router-outlet')).toBeTruthy();
        expect(query(fixture.debugElement, 'lcc-footer')).toBeTruthy();
        expect(query(fixture.debugElement, 'lcc-upcoming-event-banner')).toBeFalsy();
      });

      it('should render the pull to refresh indicator over the top of the scroller, outside its content', () => {
        const indicator = query(fixture.debugElement, 'lcc-pull-to-refresh-indicator');
        const main = query(fixture.debugElement, 'main[cdkScrollable]');

        expect(indicator.nativeElement.nextElementSibling).toBe(main.nativeElement);
        expect(query(main, 'lcc-pull-to-refresh-indicator')).toBeFalsy();
      });

      describe('upcoming event banner', () => {
        it('should render banner when showUpcomingEventBanner is true and nextEvents exist', () => {
          store.overrideSelector(AppSelectors.selectShowUpcomingEventBanner, true);
          store.overrideSelector(EventsSelectors.selectConcurrentNextEvents, [
            MOCK_EVENTS[0],
          ]);
          store.refreshState();
          fixture.detectChanges();

          expect(
            query(fixture.debugElement, 'lcc-upcoming-event-banner').componentInstance
              .nextEvents,
          ).toEqual([MOCK_EVENTS[0]]);
        });

        it('should not render banner when showUpcomingEventBanner is false', () => {
          store.overrideSelector(AppSelectors.selectShowUpcomingEventBanner, false);
          store.overrideSelector(EventsSelectors.selectConcurrentNextEvents, [
            MOCK_EVENTS[0],
          ]);
          store.refreshState();
          fixture.detectChanges();

          expect(query(fixture.debugElement, 'lcc-upcoming-event-banner')).toBeFalsy();
        });

        it('should not render banner when nextEvents is empty', () => {
          store.overrideSelector(AppSelectors.selectShowUpcomingEventBanner, true);
          store.overrideSelector(EventsSelectors.selectConcurrentNextEvents, []);
          store.refreshState();
          fixture.detectChanges();

          expect(query(fixture.debugElement, 'lcc-upcoming-event-banner')).toBeFalsy();
        });

        it('should handle clearBanner event from banner component', () => {
          store.overrideSelector(AppSelectors.selectShowUpcomingEventBanner, true);
          store.overrideSelector(EventsSelectors.selectConcurrentNextEvents, [
            MOCK_EVENTS[0],
          ]);
          store.refreshState();
          fixture.detectChanges();

          query(fixture.debugElement, 'lcc-upcoming-event-banner').triggerEventHandler(
            'clearBanner',
          );

          expect(dispatchSpy).toHaveBeenCalledTimes(1);
          expect(dispatchSpy).toHaveBeenCalledWith(
            AppActions.upcomingEventBannerCleared(),
          );
        });
      });
    });
  });
});
