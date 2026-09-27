import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { MOCK_EVENTS } from '@app/mocks/events.mock';
import { formatDate, query, queryAll, queryTextContent } from '@app/utils';

import { UpcomingEventBannerComponent } from './upcoming-event-banner.component';

class FakeResizeObserver {
  static instances: FakeResizeObserver[] = [];

  readonly observe = vi.fn();
  readonly unobserve = vi.fn();
  readonly disconnect = vi.fn();

  constructor(readonly callback: () => void) {
    FakeResizeObserver.instances.push(this);
  }
}

describe('UpcomingEventBannerComponent', () => {
  let fixture: ComponentFixture<UpcomingEventBannerComponent>;

  const element = (selector: string): HTMLElement =>
    query(fixture.debugElement, selector).nativeElement;

  const resize = (containerWidth: number, contentWidth: number): void => {
    Object.defineProperty(element('.banner-message'), 'offsetWidth', {
      configurable: true,
      value: containerWidth,
    });
    Object.defineProperty(element('.marquee-content'), 'scrollWidth', {
      configurable: true,
      value: contentWidth,
    });
    FakeResizeObserver.instances[0].callback();
    fixture.detectChanges();
  };

  beforeEach(async () => {
    vi.useFakeTimers();
    FakeResizeObserver.instances = [];
    vi.stubGlobal('ResizeObserver', FakeResizeObserver);

    await TestBed.configureTestingModule({
      imports: [UpcomingEventBannerComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(UpcomingEventBannerComponent);
    fixture.componentRef.setInput('nextEvents', [MOCK_EVENTS[0]]);
    fixture.detectChanges();
  });

  afterEach(() => vi.unstubAllGlobals());

  describe('banner message', () => {
    it('should contain the title and date of the next event', () => {
      const bannerText = queryTextContent(fixture.debugElement, '.banner-message');

      expect(bannerText).toContain(MOCK_EVENTS[0].title);
      expect(bannerText).toContain(formatDate(MOCK_EVENTS[0].eventDate));
    });

    it('should not render a link for an event without an article', () => {
      expect(query(fixture.debugElement, '.event-title-link')).toBeNull();
    });

    it('should link to the article of an event with one', () => {
      fixture.componentRef.setInput('nextEvents', [MOCK_EVENTS[1]]);
      fixture.detectChanges();

      expect(element('.event-title-link').getAttribute('href')).toBe(
        `/article/view/${MOCK_EVENTS[1].articleId}`,
      );
    });

    it('should list several events on the same date, divided', () => {
      fixture.componentRef.setInput('nextEvents', MOCK_EVENTS.slice(0, 3));
      fixture.detectChanges();

      const bannerText = queryTextContent(fixture.debugElement, '.banner-message');
      expect(queryAll(fixture.debugElement, '.event-divider')).toHaveLength(2);
      MOCK_EVENTS.slice(0, 3).forEach(event => expect(bannerText).toContain(event.title));
    });
  });

  describe('background', () => {
    it("should take a single event's colour", () => {
      expect(element('.container').style.background).toBe(
        'var(--lcc-color--upcomingEventBanner-background-blitz10Tournament)',
      );
    });

    it("should stripe several events' colours", () => {
      fixture.componentRef.setInput('nextEvents', MOCK_EVENTS.slice(0, 2));
      fixture.detectChanges();

      const background = element('.container').style.background;
      expect(background).toContain('repeating-linear-gradient');
      expect(background).toContain('blitz10Tournament');
      expect(background).toContain('championship');
    });
  });

  describe('marquee', () => {
    it('should wait two seconds before watching the message for overflow', () => {
      vi.advanceTimersByTime(1999);
      const before = FakeResizeObserver.instances.length;
      vi.advanceTimersByTime(1);

      expect(before).toBe(0);
      expect(FakeResizeObserver.instances[0].observe).toHaveBeenCalledWith(
        element('.banner-message'),
      );
    });

    it('should not scroll a message that fits', () => {
      vi.advanceTimersByTime(2000);

      resize(500, 400);

      expect(element('.marquee-content').classList).not.toContain('animate');
      expect(queryAll(fixture.debugElement, '.marquee-item')).toHaveLength(1);
    });

    it('should scroll an overflowing message on a loop, at a steady speed', () => {
      vi.advanceTimersByTime(2000);

      resize(500, 1000);

      expect(element('.marquee-content').classList).toContain('animate');
      expect(queryAll(fixture.debugElement, '.marquee-item')).toHaveLength(2);
      expect(element('.marquee-content').style.animationDuration).toBe('20s');
    });

    it('should stop scrolling once the message fits again', () => {
      vi.advanceTimersByTime(2000);
      resize(500, 1000);

      resize(600, 1000);

      expect(element('.marquee-content').classList).not.toContain('animate');
    });

    it('should stop watching once destroyed', () => {
      vi.advanceTimersByTime(2000);

      fixture.destroy();

      expect(FakeResizeObserver.instances[0].disconnect).toHaveBeenCalled();
    });

    it('should never start watching if destroyed within two seconds', () => {
      fixture.destroy();

      vi.advanceTimersByTime(2000);

      expect(FakeResizeObserver.instances).toHaveLength(0);
    });
  });

  it('should ask to clear the banner from the close button', () => {
    const clearBannerSpy = vi.spyOn(fixture.componentInstance.clearBanner, 'emit');

    element('.close-button').click();

    expect(clearBannerSpy).toHaveBeenCalledTimes(1);
  });
});
