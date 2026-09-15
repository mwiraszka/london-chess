import { TestBed } from '@angular/core/testing';

import { IS_TOUCH_DEVICE } from '@app/tokens';

import { RefreshService } from './refresh.service';

describe('RefreshService', () => {
  let service: RefreshService;
  let mockMainElement: HTMLElement;

  beforeEach(() => {
    mockMainElement = document.createElement('main');
    document.body.appendChild(mockMainElement);

    TestBed.configureTestingModule({
      providers: [RefreshService, { provide: IS_TOUCH_DEVICE, useValue: vi.fn() }],
    });

    service = TestBed.inject(RefreshService);
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

  describe('completeRefresh', () => {
    it('should reset state and emit isRefreshing false', () => {
      const isRefreshingSpy = vi.fn();

      service.isRefreshing$.subscribe(isRefreshingSpy);

      service.completeRefresh();

      expect(isRefreshingSpy).toHaveBeenCalledWith(false);
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

    it('should track pull distance internally when pulling down from top', () => {
      const touchStartEvent = new TouchEvent('touchstart', {
        touches: [{ clientY: 100 } as Touch],
      });
      mockMainElement.dispatchEvent(touchStartEvent);

      const touchMoveEvent = new TouchEvent('touchmove', {
        touches: [{ clientY: 200 } as Touch],
      });
      mockMainElement.dispatchEvent(touchMoveEvent);

      // Pull of 100px with 0.5 resistance = 50px
      expect(service['currentPullDistancePx']).toBe(50);
    });

    it('should apply resistance and cap at maximum pull distance', () => {
      const touchStartEvent = new TouchEvent('touchstart', {
        touches: [{ clientY: 100 } as Touch],
      });
      mockMainElement.dispatchEvent(touchStartEvent);

      // Pull 300px which exceeds max of 120px (after resistance)
      const touchMoveEvent = new TouchEvent('touchmove', {
        touches: [{ clientY: 400 } as Touch],
      });
      mockMainElement.dispatchEvent(touchMoveEvent);

      // Should be capped at 120px max
      expect(service['currentPullDistancePx']).toBe(120);
    });

    it('should trigger refresh when pulled past threshold', () => {
      const isRefreshingSpy = vi.fn();
      service.isRefreshing$.subscribe(isRefreshingSpy);

      const touchStartEvent = new TouchEvent('touchstart', {
        touches: [{ clientY: 100 } as Touch],
      });
      mockMainElement.dispatchEvent(touchStartEvent);

      // Pull 180px = 90px after resistance (exceeds 80px threshold)
      const touchMoveEvent = new TouchEvent('touchmove', {
        touches: [{ clientY: 280 } as Touch],
      });
      mockMainElement.dispatchEvent(touchMoveEvent);

      const touchEndEvent = new TouchEvent('touchend');
      mockMainElement.dispatchEvent(touchEndEvent);

      expect(isRefreshingSpy).toHaveBeenCalledWith(true);
    });

    it('should not trigger refresh when pulled below threshold', () => {
      const isRefreshingSpy = vi.fn();
      service.isRefreshing$.subscribe(isRefreshingSpy);

      const touchStartEvent = new TouchEvent('touchstart', {
        touches: [{ clientY: 100 } as Touch],
      });
      mockMainElement.dispatchEvent(touchStartEvent);

      // Pull 100px = 50px after resistance (below 80px threshold)
      const touchMoveEvent = new TouchEvent('touchmove', {
        touches: [{ clientY: 200 } as Touch],
      });
      mockMainElement.dispatchEvent(touchMoveEvent);

      const touchEndEvent = new TouchEvent('touchend');
      mockMainElement.dispatchEvent(touchEndEvent);

      expect(isRefreshingSpy).not.toHaveBeenCalledWith(true);
      expect(service['currentPullDistancePx']).toBe(0);
    });

    it('should not track pull when not at top of scroll', () => {
      Object.defineProperty(mockMainElement, 'scrollTop', {
        value: 50,
        writable: true,
        configurable: true,
      });

      const touchStartEvent = new TouchEvent('touchstart', {
        touches: [{ clientY: 100 } as Touch],
      });
      mockMainElement.dispatchEvent(touchStartEvent);

      const touchMoveEvent = new TouchEvent('touchmove', {
        touches: [{ clientY: 200 } as Touch],
      });
      mockMainElement.dispatchEvent(touchMoveEvent);

      expect(service['currentPullDistancePx']).toBe(0);
    });

    it('should not track pull when already refreshing', () => {
      service['isRefreshing$'].next(true);

      const touchStartEvent = new TouchEvent('touchstart', {
        touches: [{ clientY: 100 } as Touch],
      });
      mockMainElement.dispatchEvent(touchStartEvent);

      expect(service['touchStartY']).toBe(0);
    });

    it('should ignore pull-up gestures', () => {
      const touchStartEvent = new TouchEvent('touchstart', {
        touches: [{ clientY: 200 } as Touch],
      });
      mockMainElement.dispatchEvent(touchStartEvent);

      // Pull up (negative distance)
      const touchMoveEvent = new TouchEvent('touchmove', {
        touches: [{ clientY: 100 } as Touch],
      });
      mockMainElement.dispatchEvent(touchMoveEvent);

      expect(service['currentPullDistancePx']).toBe(0);
    });
  });
});
