import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { MOCK_EVENTS } from '@app/mocks/events.mock';
import { formatDate, query, queryAll, queryTextContent } from '@app/utils';

import { UpcomingEventBannerComponent } from './upcoming-event-banner.component';

describe('UpcomingEventBannerComponent', () => {
  let fixture: ComponentFixture<UpcomingEventBannerComponent>;
  let component: UpcomingEventBannerComponent;
  let clearBannerSpy: MockInstance;
  let resizeObserverMock: Mock;

  beforeEach(async () => {
    resizeObserverMock = vi.fn(function () {
      return {
        observe: vi.fn(),
        unobserve: vi.fn(),
        disconnect: vi.fn(),
      };
    });
    window.ResizeObserver = resizeObserverMock;

    await TestBed.configureTestingModule({
      imports: [UpcomingEventBannerComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(UpcomingEventBannerComponent);
    component = fixture.componentInstance;

    clearBannerSpy = vi.spyOn(component.clearBanner, 'emit');

    component.nextEvents = [MOCK_EVENTS[0]];
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('template rendering', () => {
    describe('banner message', () => {
      it('should contain the title and date of the next event', () => {
        const bannerText = queryTextContent(fixture.debugElement, '.banner-message');

        expect(bannerText).toContain(MOCK_EVENTS[0].title);
        expect(bannerText).toContain(formatDate(MOCK_EVENTS[0].eventDate));
      });

      it('should not render a link for an event without an articleId', () => {
        component.nextEvents = [MOCK_EVENTS[0]]; // articleId: ''
        fixture.detectChanges();

        expect(query(fixture.debugElement, '.event-title-link')).toBeFalsy();
      });

      it('should render a link to the article for an event with an articleId', () => {
        component.nextEvents = [MOCK_EVENTS[1]]; // has articleId
        component['changeDetectorRef'].markForCheck();
        fixture.detectChanges();

        const link = query(fixture.debugElement, '.event-title-link');
        expect(link).toBeTruthy();
        expect(link.nativeElement.getAttribute('href')).toContain(
          MOCK_EVENTS[1].articleId,
        );
      });
    });

    describe('marquee animation', () => {
      it('should render marquee content template', () => {
        const marqueeContent = query(fixture.debugElement, '.marquee-content');
        expect(marqueeContent).toBeTruthy();
      });

      it('should render single instance of content when not animating', () => {
        component['shouldAnimate'] = false;
        fixture.detectChanges();

        const marqueeItems = queryAll(fixture.debugElement, '.marquee-item');
        expect(marqueeItems.length).toBe(1);
      });

      it('should render duplicate content when animating', () => {
        component['shouldAnimate'] = true;
        component['changeDetectorRef'].markForCheck();
        fixture.detectChanges();

        const marqueeItems = queryAll(fixture.debugElement, '.marquee-item');
        expect(marqueeItems.length).toBe(2);
      });

      it('should apply animate class when shouldAnimate is true', () => {
        component['shouldAnimate'] = true;
        component['changeDetectorRef'].markForCheck();
        fixture.detectChanges();

        const marqueeContent = query(fixture.debugElement, '.marquee-content');
        expect(marqueeContent.nativeElement.classList.contains('animate')).toBe(true);
      });

      it('should not apply animate class when shouldAnimate is false', () => {
        component['shouldAnimate'] = false;
        fixture.detectChanges();

        const marqueeContent = query(fixture.debugElement, '.marquee-content');
        expect(marqueeContent.nativeElement.classList.contains('animate')).toBe(false);
      });
    });

    describe('close button', () => {
      it('should display a close icon', () => {
        expect(query(fixture.debugElement, 'ea-icon-x')).toBeTruthy();
      });

      it('should emit a clear banner event when clicked', () => {
        query(fixture.debugElement, '.close-button').nativeElement.dispatchEvent(
          new MouseEvent('click'),
        );
        fixture.detectChanges();

        expect(clearBannerSpy).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('lifecycle hooks', () => {
    it('should setup resize observer on init', () =>
      withDone(done => {
        // ResizeObserver is created after 2 second delay
        setTimeout(() => {
          expect(resizeObserverMock).toHaveBeenCalled();
          done();
        }, 2100);
      }));

    it('should disconnect resize observer on destroy', () =>
      withDone(done => {
        // Wait for observer to be created
        setTimeout(() => {
          const mockObserver = resizeObserverMock.mock.results[0].value;

          component.ngOnDestroy();

          expect(mockObserver.disconnect).toHaveBeenCalled();
          done();
        }, 2100);
      }));
  });
});
