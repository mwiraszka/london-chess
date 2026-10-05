import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';

import { IS_TOUCH_DEVICE } from '@app/tokens';

import { TouchEventsService } from './touch-events.service';

describe('TouchEventsService', () => {
  // jsdom has no Touch constructor, so the touch points are set on a real event
  const touchStart = (
    points: { clientX: number; clientY: number }[],
    target: EventTarget | null = null,
  ): TouchEvent => {
    const event = new TouchEvent('touchstart', { cancelable: true });
    Object.defineProperty(event, 'touches', { value: points });
    if (target) {
      Object.defineProperty(event, 'target', { value: target });
    }
    return event;
  };

  let service: TouchEventsService;
  let mockDocument: Document;

  let addEventListenerSpy: MockInstance;
  let clearTimeoutSpy: MockInstance;
  let isTouchDeviceSpy: MockInstance;
  let setTimeoutSpy: MockInstance;

  beforeEach(() => {
    mockDocument = document.implementation.createHTMLDocument();

    TestBed.configureTestingModule({
      providers: [
        TouchEventsService,
        { provide: DOCUMENT, useValue: mockDocument },
        { provide: IS_TOUCH_DEVICE, useValue: vi.fn() },
      ],
    });

    service = TestBed.inject(TouchEventsService);

    addEventListenerSpy = vi.spyOn(mockDocument, 'addEventListener');
    clearTimeoutSpy = vi.spyOn(window, 'clearTimeout');
    isTouchDeviceSpy = TestBed.inject(IS_TOUCH_DEVICE) as Mock;
    setTimeoutSpy = vi.spyOn(window, 'setTimeout');
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('listenForTouchEvents', () => {
    it('should not add event listeners if device is not touch-enabled', () => {
      isTouchDeviceSpy.mockReturnValue(false);

      service.listenForTouchEvents();

      expect(addEventListenerSpy).not.toHaveBeenCalled();
    });

    it('should add event listeners if device is touch-enabled', () => {
      isTouchDeviceSpy.mockReturnValue(true);

      service.listenForTouchEvents();

      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'touchstart',
        expect.any(Function),
        { passive: false },
      );
      expect(addEventListenerSpy).toHaveBeenCalledWith('touchend', expect.any(Function), {
        passive: false,
      });
      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'contextmenu',
        expect.any(Function),
        { capture: true, passive: false },
      );
    });
  });

  describe('touch event handling', () => {
    let touchStartHandler: (event: TouchEvent) => void;
    let touchEndHandler: () => void;

    beforeEach(() => {
      isTouchDeviceSpy.mockReturnValue(true);

      service.listenForTouchEvents();

      touchStartHandler = addEventListenerSpy.mock.calls.find(
        call => call[0] === 'touchstart',
      )?.[1] as (event: TouchEvent) => void;
      touchEndHandler = addEventListenerSpy.mock.calls.find(
        call => call[0] === 'touchend',
      )?.[1] as () => void;
    });

    it('should set timeout on single touch start', () => {
      const touchEvent = touchStart([{ clientX: 100, clientY: 100 }]);

      touchStartHandler(touchEvent);

      expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 500);
    });

    it('should not set timeout on multi-touch', () => {
      const touchEvent = touchStart([
        { clientX: 100, clientY: 100 },
        { clientX: 200, clientY: 200 },
      ]);

      touchStartHandler(touchEvent);

      expect(setTimeoutSpy).not.toHaveBeenCalled();
    });

    it('should clear timeout on touch end', () => {
      const touchStartEvent = touchStart([{ clientX: 100, clientY: 100 }]);

      touchStartHandler(touchStartEvent);
      touchEndHandler();

      expect(clearTimeoutSpy).toHaveBeenCalled();
    });

    it('should dispatch contextmenu event on long press for admin controls', () => {
      vi.useFakeTimers();

      const element = mockDocument.createElement('div');
      element.setAttribute('adminControls', '');
      mockDocument.body.appendChild(element);

      const dispatchEventSpy = vi.spyOn(element, 'dispatchEvent');

      const touchEvent = touchStart([{ clientX: 100, clientY: 200 }], element);

      touchStartHandler(touchEvent);
      vi.advanceTimersByTime(500);

      expect(dispatchEventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'contextmenu',
          clientX: 100,
          clientY: 200,
        }),
      );

      vi.useRealTimers();
    });

    it('should not dispatch contextmenu for elements without admin controls', () => {
      const dispatchEventSpy = vi.spyOn(mockDocument, 'dispatchEvent');

      vi.useFakeTimers();

      const element = mockDocument.createElement('div');
      mockDocument.body.appendChild(element);

      const touchEvent = touchStart([{ clientX: 100, clientY: 200 }], element);

      touchStartHandler(touchEvent);
      vi.advanceTimersByTime(500);

      expect(dispatchEventSpy).not.toHaveBeenCalled();

      vi.useRealTimers();
    });

    it('should check parent elements for admin controls attribute', () => {
      vi.useFakeTimers();

      const parent = mockDocument.createElement('div');
      parent.setAttribute('adminControls', '');
      const child = mockDocument.createElement('span');
      parent.appendChild(child);
      mockDocument.body.appendChild(parent);

      const dispatchEventSpy = vi.spyOn(child, 'dispatchEvent');

      const touchEvent = touchStart([{ clientX: 150, clientY: 250 }], child);

      touchStartHandler(touchEvent);
      vi.advanceTimersByTime(500);

      expect(dispatchEventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'contextmenu',
        }),
      );

      vi.useRealTimers();
    });

    it('should prevent contextmenu when tooltip is open', () => {
      const tooltip = mockDocument.createElement('div');
      tooltip.className = 'ea-tooltip';
      mockDocument.body.appendChild(tooltip);

      const contextMenuEvent = new MouseEvent('contextmenu', {
        bubbles: true,
        cancelable: true,
      });
      const preventDefaultSpy = vi.spyOn(contextMenuEvent, 'preventDefault');

      mockDocument.dispatchEvent(contextMenuEvent);

      expect(preventDefaultSpy).toHaveBeenCalled();
    });

    it('should not prevent contextmenu when tooltip is not open', () => {
      const contextMenuEvent = new MouseEvent('contextmenu', {
        bubbles: true,
        cancelable: true,
      });
      const preventDefaultSpy = vi.spyOn(contextMenuEvent, 'preventDefault');

      mockDocument.dispatchEvent(contextMenuEvent);

      expect(preventDefaultSpy).not.toHaveBeenCalled();
    });

    it('should clear text selection on long press for admin controls', () => {
      vi.useFakeTimers();

      const element = mockDocument.createElement('div');
      element.setAttribute('adminControls', '');
      mockDocument.body.appendChild(element);

      const removeAllRanges = vi.spyOn(window.getSelection()!, 'removeAllRanges');

      const touchEvent = touchStart([{ clientX: 100, clientY: 200 }], element);

      touchStartHandler(touchEvent);
      vi.advanceTimersByTime(500);

      expect(removeAllRanges).toHaveBeenCalled();

      vi.useRealTimers();
    });
  });
});
