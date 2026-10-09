import { DialogService } from '@eagami/ui';
import { Subject, firstValueFrom } from 'rxjs';

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Navigation, NavigationEnd, Router } from '@angular/router';

import { KEEP_SCROLL, RoutingService } from './routing.service';

describe('RoutingService', () => {
  let service: RoutingService;
  let mockDialogService: Partial<DialogService>;
  let mockRouter: Partial<Router>;
  let routerEvents$: Subject<NavigationEnd>;

  let closeAllSpy: MockInstance;
  let navigateSpy: MockInstance;
  let parseUrlSpy: MockInstance;

  beforeEach(() => {
    routerEvents$ = new Subject();

    mockDialogService = {
      closeAll: vi.fn(),
    };

    mockRouter = {
      events: routerEvents$.asObservable(),
      url: '/test',
      navigate: vi.fn().mockReturnValue(Promise.resolve(true)),
      parseUrl: vi.fn().mockReturnValue({ fragment: null }),
      lastSuccessfulNavigation: signal<Navigation | null>(null),
    };

    TestBed.configureTestingModule({
      providers: [
        RoutingService,
        { provide: DialogService, useValue: mockDialogService },
        { provide: Router, useValue: mockRouter },
      ],
    });

    service = TestBed.inject(RoutingService);

    closeAllSpy = vi.spyOn(mockDialogService, 'closeAll');
    navigateSpy = vi.spyOn(mockRouter, 'navigate');
    parseUrlSpy = vi.spyOn(mockRouter, 'parseUrl');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('fragment$', () => {
    it('should emit null initially when no fragment', async () => {
      const fragment = await firstValueFrom(service.fragment$);

      expect(fragment).toBeNull();
    });

    it('should emit fragment when navigation ends with fragment', () => {
      parseUrlSpy.mockReturnValue({ fragment: 'test-fragment' });
      const fragments: (string | null)[] = [];
      service.fragment$.subscribe(fragment => fragments.push(fragment));

      routerEvents$.next(
        new NavigationEnd(1, '/test#test-fragment', '/test#test-fragment'),
      );

      expect(fragments).toEqual([null, 'test-fragment']);
    });

    it('should emit null when navigation ends with no fragment', () => {
      parseUrlSpy.mockReturnValue({ fragment: null });

      const emissions: (string | null)[] = [];

      service.fragment$.subscribe(fragment => {
        emissions.push(fragment);
      });

      routerEvents$.next(new NavigationEnd(1, '/test', '/test'));

      expect(emissions).toEqual([null, null]);
    });
  });

  describe('pageNavigated$', () => {
    let emissions: (string | null)[];

    beforeEach(() => {
      emissions = [];
      service.pageNavigated$.subscribe(fragment => emissions.push(fragment));
    });

    it('should emit the fragment of a navigation to another page', () => {
      parseUrlSpy.mockReturnValue({ fragment: 'top' });

      routerEvents$.next(new NavigationEnd(1, '/articles#top', '/articles#top'));

      expect(emissions).toEqual(['top']);
    });

    it('should leave out a navigation that only changes the query', () => {
      routerEvents$.next(new NavigationEnd(1, '/test?page=2', '/test?page=2'));
      routerEvents$.next(new NavigationEnd(2, '/test?page=3', '/test?page=3'));

      expect(emissions).toEqual([]);
    });

    it('should emit again when the current page reloads', () => {
      routerEvents$.next(new NavigationEnd(1, '/test', '/test'));

      expect(emissions).toEqual([null]);
    });

    it('should leave out a navigation that asks to keep the scroll position', () => {
      (
        mockRouter.lastSuccessfulNavigation as ReturnType<
          typeof signal<Navigation | null>
        >
      ).set({
        extras: { info: KEEP_SCROLL },
      } as Navigation);

      routerEvents$.next(new NavigationEnd(1, '/games/2', '/games/2'));

      expect(emissions).toEqual([]);
    });

    it('should emit when the query goes along with a move to another page', () => {
      routerEvents$.next(new NavigationEnd(1, '/articles?page=2', '/articles?page=2'));

      expect(emissions).toEqual([null]);
    });
  });

  describe('currentFragment', () => {
    it('should return null when no fragment', () => {
      expect(service.currentFragment).toBeNull();
    });

    it('should return current fragment value', async () => {
      parseUrlSpy.mockReturnValue({ fragment: 'my-fragment' });

      routerEvents$.next(new NavigationEnd(1, '/test#my-fragment', '/test#my-fragment'));
      await firstValueFrom(service.fragment$);

      expect(service.currentFragment).toBe('my-fragment');
    });
  });

  describe('removeFragment', () => {
    it('should navigate without fragment', () => {
      parseUrlSpy.mockReturnValue({ fragment: 'test-fragment' });

      routerEvents$.next(
        new NavigationEnd(1, '/test#test-fragment', '/test#test-fragment'),
      );

      service.removeFragment();

      expect(navigateSpy).toHaveBeenCalledWith([], {
        fragment: undefined,
        queryParamsHandling: 'preserve',
        replaceUrl: true,
      });
    });

    it('should not navigate when no fragment present', () => {
      service.removeFragment();

      expect(navigateSpy).not.toHaveBeenCalled();
    });

    it('should update fragment$ to null', () => {
      parseUrlSpy.mockReturnValue({ fragment: 'test-fragment' });
      routerEvents$.next(
        new NavigationEnd(1, '/test#test-fragment', '/test#test-fragment'),
      );
      const fragments: (string | null)[] = [];
      service.fragment$.subscribe(fragment => fragments.push(fragment));

      service.removeFragment();

      expect(fragments).toEqual(['test-fragment', null]);
    });
  });

  describe('dialog closing on navigation', () => {
    it('should close all dialogs when fragment changes', () => {
      parseUrlSpy.mockReturnValueOnce({ fragment: 'fragment1' });

      routerEvents$.next(new NavigationEnd(1, '/test#fragment1', '/test#fragment1'));

      parseUrlSpy.mockReturnValueOnce({ fragment: 'fragment2' });

      routerEvents$.next(new NavigationEnd(2, '/test#fragment2', '/test#fragment2'));

      expect(closeAllSpy).toHaveBeenCalled();
    });

    it('should not close dialogs when fragment stays the same', () => {
      parseUrlSpy.mockReturnValue({ fragment: 'same-fragment' });

      routerEvents$.next(
        new NavigationEnd(1, '/test#same-fragment', '/test#same-fragment'),
      );

      closeAllSpy.mockClear();

      routerEvents$.next(
        new NavigationEnd(2, '/test#same-fragment', '/test#same-fragment'),
      );

      expect(closeAllSpy).not.toHaveBeenCalled();
    });

    it('should not close dialogs when no initial fragment', () => {
      parseUrlSpy.mockReturnValue({ fragment: null });

      routerEvents$.next(new NavigationEnd(1, '/test', '/test'));

      closeAllSpy.mockClear();

      routerEvents$.next(new NavigationEnd(2, '/test', '/test'));

      expect(closeAllSpy).not.toHaveBeenCalled();
    });

    it('should close dialogs when fragment removed', () => {
      parseUrlSpy.mockReturnValueOnce({ fragment: 'fragment1' });

      routerEvents$.next(new NavigationEnd(1, '/test#fragment1', '/test#fragment1'));

      parseUrlSpy.mockReturnValueOnce({ fragment: null });

      routerEvents$.next(new NavigationEnd(2, '/test', '/test'));

      expect(closeAllSpy).toHaveBeenCalled();
    });
  });
});
