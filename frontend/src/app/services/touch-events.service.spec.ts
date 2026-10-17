import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';

import { IS_TOUCH_DEVICE } from '@app/tokens';

import { TouchEventsService } from './touch-events.service';

describe('TouchEventsService', () => {
  let service: TouchEventsService;
  let mockDocument: Document;

  let addEventListenerSpy: MockInstance;
  let isTouchDeviceSpy: MockInstance;

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
    isTouchDeviceSpy = TestBed.inject(IS_TOUCH_DEVICE) as Mock;
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

    it('should listen for context menu requests if device is touch-enabled', () => {
      isTouchDeviceSpy.mockReturnValue(true);

      service.listenForTouchEvents();

      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'contextmenu',
        expect.any(Function),
        { capture: true, passive: false },
      );
    });
  });

  describe('context menu handling', () => {
    beforeEach(() => {
      isTouchDeviceSpy.mockReturnValue(true);
      service.listenForTouchEvents();
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
  });
});
