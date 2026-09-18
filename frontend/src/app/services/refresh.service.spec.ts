import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { Subject } from 'rxjs';

import { TestBed } from '@angular/core/testing';

import { AppActions } from '@app/store/app';
import { IS_TOUCH_DEVICE } from '@app/tokens';

import { PendingRequestsService } from './pending-requests.service';
import { RefreshService } from './refresh.service';

describe('RefreshService', () => {
  let service: RefreshService;
  let mockMainElement: HTMLElement;
  let pendingRequests: PendingRequestsService;
  let store: MockStore;

  let dispatchSpy: MockInstance;

  function pull(fromY: number, toY: number): void {
    mockMainElement.dispatchEvent(
      new TouchEvent('touchstart', { touches: [{ clientY: fromY } as Touch] }),
    );
    mockMainElement.dispatchEvent(
      new TouchEvent('touchmove', { touches: [{ clientY: toY } as Touch] }),
    );
  }

  function release(): void {
    mockMainElement.dispatchEvent(new TouchEvent('touchend'));
  }

  beforeEach(() => {
    mockMainElement = document.createElement('main');
    document.body.appendChild(mockMainElement);

    TestBed.configureTestingModule({
      providers: [
        RefreshService,
        { provide: IS_TOUCH_DEVICE, useValue: vi.fn() },
        provideMockStore(),
      ],
    });

    service = TestBed.inject(RefreshService);
    pendingRequests = TestBed.inject(PendingRequestsService);
    store = TestBed.inject(MockStore);

    dispatchSpy = vi.spyOn(store, 'dispatch');
  });

  afterEach(() => {
    service.destroy();
    document.body.removeChild(mockMainElement);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('initialize', () => {
    it('should set up touch event listeners on touch devices', () => {
      const addEventListenerSpy = vi.spyOn(mockMainElement, 'addEventListener');
      vi.mocked(TestBed.inject(IS_TOUCH_DEVICE)).mockReturnValue(true);

      service.initialize(mockMainElement);

      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'touchstart',
        expect.any(Function),
        { passive: true },
      );
      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'touchmove',
        expect.any(Function),
        { passive: false },
      );
      expect(addEventListenerSpy).toHaveBeenCalledWith('touchend', expect.any(Function), {
        passive: true,
      });
    });

    it('should not initialize on non-touch devices', () => {
      const addEventListenerSpy = vi.spyOn(mockMainElement, 'addEventListener');
      vi.mocked(TestBed.inject(IS_TOUCH_DEVICE)).mockReturnValue(false);

      service.initialize(mockMainElement);

      expect(addEventListenerSpy).not.toHaveBeenCalled();
    });
  });

  describe('destroy', () => {
    it('should remove event listeners', () => {
      const removeEventListenerSpy = vi.spyOn(mockMainElement, 'removeEventListener');
      vi.mocked(TestBed.inject(IS_TOUCH_DEVICE)).mockReturnValue(true);

      service.initialize(mockMainElement);
      service.destroy();

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'touchstart',
        expect.any(Function),
      );
      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'touchmove',
        expect.any(Function),
      );
      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'touchend',
        expect.any(Function),
      );
    });

    it('should handle destroy when not initialized', () => {
      expect(() => service.destroy()).not.toThrow();
    });
  });

  describe('touch gestures', () => {
    beforeEach(() => {
      vi.mocked(TestBed.inject(IS_TOUCH_DEVICE)).mockReturnValue(true);
      service.initialize(mockMainElement);
      Object.defineProperty(mockMainElement, 'scrollTop', {
        value: 0,
        writable: true,
        configurable: true,
      });
    });

    it('should report pull progress towards the refresh threshold', () => {
      pull(100, 200);

      expect(service['pullDistancePx']()).toBe(50);
      expect(service.pullProgress()).toBe(50 / 80);
    });

    it('should apply resistance and cap the pull distance', () => {
      pull(100, 400);

      expect(service['pullDistancePx']()).toBe(120);
      expect(service.pullProgress()).toBe(1);
    });

    it('should refresh the app when pulled past the threshold', () => {
      pull(100, 280);
      release();

      expect(dispatchSpy).toHaveBeenCalledTimes(1);
      expect(dispatchSpy).toHaveBeenCalledWith(AppActions.refreshAppRequested());
      expect(service.isRefreshing()).toBe(true);
      expect(service.pullProgress()).toBe(0);
    });

    it('should not refresh the app when released below the threshold', () => {
      pull(100, 200);
      release();

      expect(dispatchSpy).not.toHaveBeenCalled();
      expect(service.isRefreshing()).toBe(false);
      expect(service.pullProgress()).toBe(0);
    });

    it('should not track a pull when the page is scrolled down', () => {
      mockMainElement.scrollTop = 50;

      pull(100, 200);

      expect(service.pullProgress()).toBe(0);
    });

    it('should ignore pull-up gestures', () => {
      pull(200, 100);

      expect(service.pullProgress()).toBe(0);
    });

    describe('while refreshing', () => {
      let request$: Subject<void>;

      beforeEach(() => {
        request$ = new Subject<void>();
        dispatchSpy.mockImplementation(() =>
          pendingRequests.track(request$).subscribe({ error: () => undefined }),
        );

        pull(100, 280);
        release();
        TestBed.tick();
      });

      it('should keep refreshing until the requests it started have settled', () => {
        expect(service.isRefreshing()).toBe(true);

        request$.complete();
        TestBed.tick();

        expect(service.isRefreshing()).toBe(false);
      });

      it('should stop refreshing when those requests fail', () => {
        request$.error(new Error('Network error'));
        TestBed.tick();

        expect(service.isRefreshing()).toBe(false);
      });

      it('should ignore further pulls', () => {
        pull(100, 280);
        release();

        expect(dispatchSpy).toHaveBeenCalledTimes(1);
        expect(service.pullProgress()).toBe(0);
      });
    });

    it('should stop refreshing straight away when no request was needed', () => {
      pull(100, 280);
      release();
      TestBed.tick();

      expect(service.isRefreshing()).toBe(false);
    });
  });
});
