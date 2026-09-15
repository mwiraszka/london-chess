import { Subject } from 'rxjs';

import { TestBed } from '@angular/core/testing';
import { NavigationEnd, Router } from '@angular/router';

import { DialogService } from './dialog.service';
import { RoutingService } from './routing.service';

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
    it('should emit null initially when no fragment', () =>
      withDone(done => {
        service.fragment$.subscribe(fragment => {
          expect(fragment).toBeNull();
          done();
        });
      }));

    it('should emit fragment when navigation ends with fragment', () =>
      withDone(done => {
        parseUrlSpy.mockReturnValue({ fragment: 'test-fragment' });

        service.fragment$.subscribe(fragment => {
          if (fragment === 'test-fragment') {
            expect(fragment).toBe('test-fragment');
            done();
          }
        });

        routerEvents$.next(
          new NavigationEnd(1, '/test#test-fragment', '/test#test-fragment'),
        );
      }));

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

  describe('currentFragment', () => {
    it('should return null when no fragment', () => {
      expect(service.currentFragment).toBeNull();
    });

    it('should return current fragment value', () =>
      withDone(done => {
        parseUrlSpy.mockReturnValue({ fragment: 'my-fragment' });

        routerEvents$.next(
          new NavigationEnd(1, '/test#my-fragment', '/test#my-fragment'),
        );

        service.fragment$.subscribe(() => {
          expect(service.currentFragment).toBe('my-fragment');
          done();
        });
      }));
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

    it('should update fragment$ to null', () =>
      withDone(done => {
        parseUrlSpy.mockReturnValue({ fragment: 'test-fragment' });
        routerEvents$.next(
          new NavigationEnd(1, '/test#test-fragment', '/test#test-fragment'),
        );

        navigateSpy.mockImplementation(() => {
          service['_fragmentSubject'].next(null);
          return Promise.resolve(true);
        });

        service.removeFragment();

        service.fragment$.subscribe(fragment => {
          if (fragment === null) {
            done();
          }
        });
      }));
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
