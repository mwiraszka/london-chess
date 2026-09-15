import { ChangeDetectorRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Image } from '@app/models';
import { query, queryAll } from '@app/utils';

import { PhotoCarouselComponent } from './photo-carousel.component';

describe('PhotoCarouselComponent', () => {
  let fixture: ComponentFixture<PhotoCarouselComponent>;
  let component: PhotoCarouselComponent;

  const mockPhotos: Partial<Image>[] = [
    {
      id: 'photo-1',
      mainUrl: 'https://example.com/photo1.jpg',
      caption: 'First photo caption',
    },
    {
      id: 'photo-2',
      mainUrl: 'https://example.com/photo2.jpg',
      caption: 'Second photo caption',
    },
    {
      id: 'photo-3',
      mainUrl: 'https://example.com/photo3.jpg',
      caption: 'Third photo caption',
    },
  ];

  beforeEach(async () => {
    vi.useFakeTimers();

    await TestBed.configureTestingModule({
      imports: [PhotoCarouselComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PhotoCarouselComponent);
    component = fixture.componentInstance;

    fixture.componentRef.setInput('photos', mockPhotos);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('initialization', () => {
    it('should start with currentIndex at 0', () => {
      expect(component.currentIndex).toBe(0);
    });

    it('should auto-cycle through photos every 4 seconds', () => {
      expect(component.currentIndex).toBe(0);

      vi.advanceTimersByTime(4000);
      expect(component.currentIndex).toBe(1);

      vi.advanceTimersByTime(4000);
      expect(component.currentIndex).toBe(2);

      vi.advanceTimersByTime(4000);
      expect(component.currentIndex).toBe(0);
    });
  });

  describe('onPreviousPhoto', () => {
    it('should move to previous photo', () => {
      component.currentIndex = 1;
      component.onPreviousPhoto();

      expect(component.currentIndex).toBe(0);
    });

    it('should wrap to last photo when at first photo', () => {
      component.currentIndex = 0;
      component.onPreviousPhoto();

      expect(component.currentIndex).toBe(2);
    });

    it('should reset auto-cycle timer', () => {
      component.currentIndex = 0;
      vi.advanceTimersByTime(2000);

      component.onPreviousPhoto();
      expect(component.currentIndex).toBe(2);

      vi.advanceTimersByTime(3999);
      expect(component.currentIndex).toBe(2);

      vi.advanceTimersByTime(1);
      expect(component.currentIndex).toBe(0);
    });
  });

  describe('onNextPhoto', () => {
    it('should move to next photo', () => {
      component.currentIndex = 0;
      component.onNextPhoto();

      expect(component.currentIndex).toBe(1);
    });

    it('should wrap to first photo when at last photo', () => {
      component.currentIndex = 2;
      component.onNextPhoto();

      expect(component.currentIndex).toBe(0);
    });

    it('should reset auto-cycle timer', () => {
      component.currentIndex = 0;
      vi.advanceTimersByTime(100);

      component.onNextPhoto();
      expect(component.currentIndex).toBe(1);

      vi.advanceTimersByTime(3999);
      expect(component.currentIndex).toBe(1);

      vi.advanceTimersByTime(1);
      expect(component.currentIndex).toBe(2);
    });
  });

  describe('onSelectPhoto', () => {
    it('should set currentIndex to specified index', () => {
      component.onSelectPhoto(2);
      expect(component.currentIndex).toBe(2);
    });

    it('should reset auto-cycle timer', () => {
      component.currentIndex = 0;
      vi.advanceTimersByTime(3500);

      component.onSelectPhoto(1);
      expect(component.currentIndex).toBe(1);

      vi.advanceTimersByTime(3999);
      expect(component.currentIndex).toBe(1);

      vi.advanceTimersByTime(1);
      expect(component.currentIndex).toBe(2);
    });
  });

  describe('template rendering', () => {
    it('should render all photos with correct attributes', () => {
      const imageElements = queryAll(fixture.debugElement, '.carousel-photo');
      expect(imageElements.length).toBe(3);

      imageElements.forEach((imgEl, index) => {
        expect(imgEl.nativeElement.src).toBe(mockPhotos[index].mainUrl);
        expect(imgEl.nativeElement.alt).toBe(mockPhotos[index].caption);
      });
    });

    it('should mark active photo with active class', () => {
      let imageWrappers = queryAll(fixture.debugElement, '.image-wrapper');
      expect(imageWrappers[0].nativeElement.classList.contains('active')).toBe(true);
      expect(imageWrappers[1].nativeElement.classList.contains('active')).toBe(false);
      expect(imageWrappers[2].nativeElement.classList.contains('active')).toBe(false);

      component.currentIndex = 1;
      fixture.debugElement.injector.get(ChangeDetectorRef).markForCheck();
      fixture.detectChanges();
      imageWrappers = queryAll(fixture.debugElement, '.image-wrapper');

      expect(imageWrappers[0].nativeElement.classList.contains('active')).toBe(false);
      expect(imageWrappers[1].nativeElement.classList.contains('active')).toBe(true);
      expect(imageWrappers[2].nativeElement.classList.contains('active')).toBe(false);
    });

    it('should render captions for all photos', () => {
      const captionElements = queryAll(fixture.debugElement, '.caption');
      expect(captionElements.length).toBe(3);

      captionElements.forEach((captionEl, index) => {
        const expectedCaption = mockPhotos[index].caption?.replace(': ', ': \n');
        expect(captionEl.nativeElement.textContent.trim()).toBe(expectedCaption);
      });
    });

    it('should mark active caption with active class', () => {
      let captionElements = queryAll(fixture.debugElement, '.caption');
      expect(captionElements[0].nativeElement.classList.contains('active')).toBe(true);
      expect(captionElements[1].nativeElement.classList.contains('active')).toBe(false);
      expect(captionElements[2].nativeElement.classList.contains('active')).toBe(false);

      component.currentIndex = 2;
      fixture.debugElement.injector.get(ChangeDetectorRef).markForCheck();
      fixture.detectChanges();
      captionElements = queryAll(fixture.debugElement, '.caption');

      expect(captionElements[0].nativeElement.classList.contains('active')).toBe(false);
      expect(captionElements[1].nativeElement.classList.contains('active')).toBe(false);
      expect(captionElements[2].nativeElement.classList.contains('active')).toBe(true);
    });

    it('should render navigation dots for all photos', () => {
      const dotElements = queryAll(fixture.debugElement, '.dot-button');
      expect(dotElements.length).toBe(3);

      dotElements.forEach((dotEl, index) => {
        expect(dotEl.nativeElement.getAttribute('aria-label')).toBe(
          `View photo ${index + 1}`,
        );
      });
    });

    it('should mark active dot with active class', () => {
      let dotElements = queryAll(fixture.debugElement, '.dot-button');
      expect(dotElements[0].nativeElement.classList.contains('active')).toBe(true);
      expect(dotElements[1].nativeElement.classList.contains('active')).toBe(false);
      expect(dotElements[2].nativeElement.classList.contains('active')).toBe(false);

      component.currentIndex = 1;
      fixture.debugElement.injector.get(ChangeDetectorRef).markForCheck();
      fixture.detectChanges();
      dotElements = queryAll(fixture.debugElement, '.dot-button');

      expect(dotElements[0].nativeElement.classList.contains('active')).toBe(false);
      expect(dotElements[1].nativeElement.classList.contains('active')).toBe(true);
      expect(dotElements[2].nativeElement.classList.contains('active')).toBe(false);
    });

    it('should set correct tabindex for active image wrapper', () => {
      let imageWrappers = queryAll(fixture.debugElement, '.image-wrapper');
      expect(imageWrappers[0].nativeElement.tabIndex).toBe(0);
      expect(imageWrappers[1].nativeElement.tabIndex).toBe(-1);
      expect(imageWrappers[2].nativeElement.tabIndex).toBe(-1);

      component.currentIndex = 2;
      fixture.debugElement.injector.get(ChangeDetectorRef).markForCheck();
      fixture.detectChanges();
      imageWrappers = queryAll(fixture.debugElement, '.image-wrapper');

      expect(imageWrappers[0].nativeElement.tabIndex).toBe(-1);
      expect(imageWrappers[1].nativeElement.tabIndex).toBe(-1);
      expect(imageWrappers[2].nativeElement.tabIndex).toBe(0);
    });

    it('should have correct aria-label for active image wrapper', () => {
      const activeWrapper = query(fixture.debugElement, '.image-wrapper.active');
      const expectedLabel = 'View next photo, currently showing ' + mockPhotos[0].caption;
      expect(activeWrapper.nativeElement.getAttribute('aria-label')).toBe(expectedLabel);
    });
  });

  describe('keyboard navigation', () => {
    it('should move to next photo on arrow right keydown', () => {
      const keydownEvent = new KeyboardEvent('keydown', { key: 'ArrowRight' });

      fixture.nativeElement.dispatchEvent(keydownEvent);

      expect(component.currentIndex).toBe(1);
    });

    it('should move to previous photo on arrow left keydown', () => {
      component.currentIndex = 1;
      fixture.detectChanges();

      const keydownEvent = new KeyboardEvent('keydown', { key: 'ArrowLeft' });

      fixture.nativeElement.dispatchEvent(keydownEvent);

      expect(component.currentIndex).toBe(0);
    });

    it('should move to next photo on enter keydown', () => {
      const keydownEvent = new KeyboardEvent('keydown', { key: 'Enter' });

      fixture.nativeElement.dispatchEvent(keydownEvent);

      expect(component.currentIndex).toBe(1);
    });

    it('should handle keyboard events from any focused child element', () => {
      const dotButton = query(fixture.debugElement, '.dot-button');
      const keydownEvent = new KeyboardEvent('keydown', {
        key: 'ArrowRight',
        bubbles: true,
      });

      dotButton.nativeElement.dispatchEvent(keydownEvent);

      expect(component.currentIndex).toBe(1);
    });
  });

  describe('click interactions', () => {
    it('should move to next photo when clicking on active image', () => {
      query(fixture.debugElement, '.image-wrapper.active').nativeElement.click();
      expect(component.currentIndex).toBe(1);
    });

    it('should select specific photo when clicking on dot', () => {
      queryAll(fixture.debugElement, '.dot-button')[2].nativeElement.click();
      expect(component.currentIndex).toBe(2);
    });
  });

  describe('edge cases', () => {
    beforeEach(() => {
      const singlePhoto: Partial<Image>[] = [
        {
          id: 'single-photo',
          mainUrl: 'https://example.com/single.jpg',
          caption: 'Single photo',
        },
      ];
      fixture.componentRef.setInput('photos', singlePhoto);
      fixture.detectChanges();
    });

    it('should handle single photo correctly', () => {
      expect(component.currentIndex).toBe(0);

      component.onNextPhoto();
      expect(component.currentIndex).toBe(0);

      component.onPreviousPhoto();
      expect(component.currentIndex).toBe(0);
    });

    it('should handle single photo auto-cycling', () => {
      expect(component.currentIndex).toBe(0);

      vi.advanceTimersByTime(4000);
      expect(component.currentIndex).toBe(0);
    });
  });
});
