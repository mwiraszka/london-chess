import { Subject } from 'rxjs';

import { WritableSignal, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  Navigation,
  NavigationStart,
  Router,
  Event as RouterEvent,
} from '@angular/router';

import { RoutingService } from './routing.service';
import { ScrollPositionService } from './scroll-position.service';

type MockNavigation = Pick<Navigation, 'trigger'> & { previousNavigation: object | null };

interface MockRouter {
  events: Subject<RouterEvent>;
  lastSuccessfulNavigation: WritableSignal<MockNavigation | null>;
  navigated: boolean;
  url: string;
}

class FakeResizeObserver {
  static instances: FakeResizeObserver[] = [];

  readonly observe = vi.fn();
  readonly disconnect = vi.fn();

  constructor(readonly callback: () => void) {
    FakeResizeObserver.instances.push(this);
  }
}

const BACK_FORWARD_LOAD: PerformanceEntry & { type: string } = {
  duration: 0,
  entryType: 'navigation',
  name: '',
  startTime: 0,
  toJSON: () => ({}),
  type: 'back_forward',
};

const FIRST_PAGE: MockNavigation = { trigger: 'imperative', previousNavigation: null };
const FOLLOWED_LINK: MockNavigation = { trigger: 'imperative', previousNavigation: {} };
const HISTORY_STEP: MockNavigation = { trigger: 'popstate', previousNavigation: {} };

describe('ScrollPositionService', () => {
  let content: HTMLElement;
  let pageNavigated$: Subject<string | null>;
  let router: MockRouter;
  let scroller: HTMLElement;
  let service: ScrollPositionService;

  const leavePageAt = (top: number): void => {
    scroller.scrollTop = top;
    router.events.next(new NavigationStart(2, '/next'));
  };

  const arriveAt = (
    url: string,
    navigation: MockNavigation,
    fragment: string | null = null,
  ): void => {
    router.url = url;
    router.lastSuccessfulNavigation.set(navigation);
    pageNavigated$.next(fragment);
  };

  const rememberedPosition = (url: string): string | null =>
    sessionStorage.getItem(`lcc-scroll-position:${url}`);

  beforeEach(() => {
    FakeResizeObserver.instances = [];
    vi.stubGlobal('ResizeObserver', FakeResizeObserver);

    content = document.createElement('main');
    pageNavigated$ = new Subject<string | null>();
    router = {
      events: new Subject<RouterEvent>(),
      lastSuccessfulNavigation: signal<MockNavigation | null>(null),
      navigated: true,
      url: '/article',
    };
    scroller = document.createElement('div');
    scroller.scrollTo = vi.fn();

    TestBed.configureTestingModule({
      providers: [
        ScrollPositionService,
        { provide: Router, useValue: router },
        { provide: RoutingService, useValue: { pageNavigated$ } },
      ],
    });
    service = TestBed.inject(ScrollPositionService);
    service.initialize(scroller, content);
  });

  afterEach(() => {
    sessionStorage.clear();
    vi.unstubAllGlobals();
  });

  describe('remembering a position', () => {
    it('should remember how far down a page was when leaving it for another', () => {
      leavePageAt(300);

      expect(rememberedPosition('/article')).toBe('300');
    });

    it('should remember how far down a page was when leaving the site', () => {
      scroller.scrollTop = 300;

      window.dispatchEvent(new Event('pagehide'));

      expect(rememberedPosition('/article')).toBe('300');
    });

    it('should keep what it remembers while the first page is still opening', () => {
      sessionStorage.setItem('lcc-scroll-position:/article', '300');
      router.navigated = false;

      leavePageAt(0);

      expect(rememberedPosition('/article')).toBe('300');
    });
  });

  describe('opening a page', () => {
    beforeEach(() => {
      leavePageAt(300);
    });

    it('should return to the position after a step back within the site', () => {
      arriveAt('/faq', FOLLOWED_LINK);

      arriveAt('/article', HISTORY_STEP);
      FakeResizeObserver.instances[0].callback();

      expect(FakeResizeObserver.instances[0].observe).toHaveBeenCalledWith(content);
      expect(scroller.scrollTo).toHaveBeenLastCalledWith({ top: 300 });
    });

    it('should return to the position after coming back from another site', () => {
      vi.spyOn(performance, 'getEntriesByType').mockReturnValue([BACK_FORWARD_LOAD]);

      arriveAt('/article', FIRST_PAGE);
      FakeResizeObserver.instances[0].callback();

      expect(scroller.scrollTo).toHaveBeenCalledWith({ top: 300 });
    });

    it('should stay at the position each time the page grows', () => {
      arriveAt('/article', HISTORY_STEP);

      FakeResizeObserver.instances[0].callback();
      FakeResizeObserver.instances[0].callback();

      expect(scroller.scrollTo).toHaveBeenCalledTimes(2);
    });

    it('should open at the top after a step to a page with no position', () => {
      arriveAt('/faq', HISTORY_STEP);

      expect(FakeResizeObserver.instances).toHaveLength(0);
      expect(scroller.scrollTo).toHaveBeenCalledWith({ top: 0 });
    });

    it('should open at the top after following a link to a page seen before', () => {
      arriveAt('/article', FOLLOWED_LINK);

      expect(FakeResizeObserver.instances).toHaveLength(0);
      expect(scroller.scrollTo).toHaveBeenCalledWith({ top: 0 });
    });

    it('should open at the top on a fresh visit to a page seen before', () => {
      arriveAt('/article', FIRST_PAGE);

      expect(FakeResizeObserver.instances).toHaveLength(0);
      expect(scroller.scrollTo).toHaveBeenCalledWith({ top: 0 });
    });

    it('should leave a page opened at a fragment to scroll to it', () => {
      arriveAt('/faq', FOLLOWED_LINK, 'second-part');

      expect(scroller.scrollTo).not.toHaveBeenCalled();
    });

    it('should prefer the position to the fragment of a page stepped back to', () => {
      sessionStorage.setItem('lcc-scroll-position:/faq#second-part', '500');

      arriveAt('/faq#second-part', HISTORY_STEP, 'second-part');
      FakeResizeObserver.instances[0].callback();

      expect(scroller.scrollTo).toHaveBeenCalledWith({ top: 500 });
    });
  });

  describe('holding a position', () => {
    beforeEach(() => {
      leavePageAt(300);
      arriveAt('/article', HISTORY_STEP);
    });

    it('should report the position as held', () => {
      expect(service.isHoldingPosition()).toBe(true);
    });

    it.each(['keydown', 'pointerdown', 'wheel'])(
      'should let go on a %s from the visitor',
      eventType => {
        window.dispatchEvent(new Event(eventType));

        expect(FakeResizeObserver.instances[0].disconnect).toHaveBeenCalled();
        expect(service.isHoldingPosition()).toBe(false);
      },
    );

    it('should let go on leaving the page', () => {
      leavePageAt(300);

      expect(FakeResizeObserver.instances[0].disconnect).toHaveBeenCalled();
      expect(service.isHoldingPosition()).toBe(false);
    });
  });
});
