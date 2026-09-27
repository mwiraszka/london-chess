import { Component, DebugElement, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { Image } from '@app/models';

import { ImageComponent } from './image.component';

const FALLBACK_SRC = 'assets/fallback-image.png';
const TRANSPARENT_PIXEL =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
const MAIN_URL = 'https://example.com/main.jpg';
const THUMBNAIL_URL = 'https://example.com/thumb.jpg';

const makeImage = (overrides: Partial<Image> = {}): Image => ({
  id: 'img-1',
  filename: 'test.jpg',
  caption: 'Test caption',
  album: 'album-1',
  albumCover: false,
  albumOrdinality: '1',
  modificationInfo: {
    createdBy: 'Tester',
    createdByNumber: null,
    dateCreated: '2025-01-01T00:00:00Z',
    lastEditedBy: 'Tester',
    lastEditedByNumber: null,
    dateLastEdited: '2025-01-01T00:00:00Z',
  },
  ...overrides,
});

@Component({
  template: `<lcc-image [image]="image()" />`,
  imports: [ImageComponent],
})
class HostComponent {
  public readonly image = signal<Image | null>(null);
}

describe('ImageComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  let componentDebug: DebugElement;
  let component: ImageComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;

    fixture.detectChanges();

    componentDebug = fixture.debugElement.query(By.directive(ImageComponent));
    component = componentDebug.componentInstance;
  });

  const img = (): DebugElement => componentDebug.query(By.css('img'));

  describe('source resolution', () => {
    it('should show fallback with shimmer overlay when image is null', () => {
      host.image.set(null);
      fixture.detectChanges();

      expect(component.displayMode()).toBe('fallback');
      expect(component.currentSrc()).toBe(FALLBACK_SRC);
      expect(component.showShimmer()).toBe(true);
    });

    it('should show shimmer when image has no URLs', () => {
      host.image.set(makeImage());
      fixture.detectChanges();

      expect(component.displayMode()).toBe('none');
      expect(component.currentSrc()).toBe(TRANSPARENT_PIXEL);
      expect(component.showShimmer()).toBe(true);
    });

    it('should show main URL directly when only main is present', () => {
      host.image.set(makeImage({ mainUrl: MAIN_URL }));
      fixture.detectChanges();

      expect(component.displayMode()).toBe('main');
      expect(component.currentSrc()).toBe(MAIN_URL);
      expect(component.blurred()).toBe(false);
    });

    it('should show thumbnail URL when only thumbnail is present', () => {
      host.image.set(makeImage({ thumbnailUrl: THUMBNAIL_URL }));
      fixture.detectChanges();

      expect(component.displayMode()).toBe('thumbnail');
      expect(component.currentSrc()).toBe(THUMBNAIL_URL);
      expect(component.blurred()).toBe(false);
    });

    it('should show blurred thumbnail when both URLs are present', () => {
      host.image.set(makeImage({ mainUrl: MAIN_URL, thumbnailUrl: THUMBNAIL_URL }));
      fixture.detectChanges();

      expect(component.displayMode()).toBe('thumbnail');
      expect(component.currentSrc()).toBe(THUMBNAIL_URL);
      expect(component.blurred()).toBe(true);
    });
  });

  describe('shimmer gating', () => {
    it('should keep the shimmer visible until the img element fires load', () => {
      host.image.set(makeImage({ mainUrl: MAIN_URL }));
      fixture.detectChanges();

      expect(component.showShimmer()).toBe(true);

      img().triggerEventHandler('load', {});
      fixture.detectChanges();

      expect(component.showShimmer()).toBe(false);
    });

    it('should ignore load events for the transparent pixel placeholder', () => {
      host.image.set(makeImage());
      fixture.detectChanges();

      img().triggerEventHandler('load', {});
      fixture.detectChanges();

      expect(component.hasLoaded()).toBe(false);
      expect(component.showShimmer()).toBe(true);
    });

    it('should re-show the shimmer when the image input changes to a new URL', () => {
      host.image.set(makeImage({ mainUrl: MAIN_URL }));
      fixture.detectChanges();
      img().triggerEventHandler('load', {});
      fixture.detectChanges();
      expect(component.showShimmer()).toBe(false);

      host.image.set(
        makeImage({ id: 'img-2', mainUrl: 'https://example.com/other.jpg' }),
      );
      fixture.detectChanges();

      expect(component.showShimmer()).toBe(true);
    });
  });

  describe('aspect ratio', () => {
    it('should compute aspect ratio from image dimensions', () => {
      host.image.set(makeImage({ mainUrl: MAIN_URL, mainWidth: 1920, mainHeight: 1080 }));
      fixture.detectChanges();

      expect(component.aspectRatio()).toBe('16 / 9');
    });

    it('should return null when dimensions are missing', () => {
      host.image.set(makeImage({ mainUrl: MAIN_URL }));
      fixture.detectChanges();

      expect(component.aspectRatio()).toBeNull();
    });
  });

  describe('error handling', () => {
    it('should fall back to thumbnail when main fails', () => {
      host.image.set(makeImage({ mainUrl: MAIN_URL, thumbnailUrl: THUMBNAIL_URL }));
      fixture.detectChanges();
      component.displayMode.set('main');
      component.currentSrc.set(MAIN_URL);

      img().triggerEventHandler('error', {});

      expect(component.displayMode()).toBe('thumbnail');
      expect(component.currentSrc()).toBe(THUMBNAIL_URL);
    });

    it('should fall back to main when thumbnail fails', () => {
      host.image.set(makeImage({ mainUrl: MAIN_URL, thumbnailUrl: THUMBNAIL_URL }));
      fixture.detectChanges();
      component.displayMode.set('thumbnail');
      component.currentSrc.set(THUMBNAIL_URL);

      img().triggerEventHandler('error', {});

      expect(component.displayMode()).toBe('main');
      expect(component.currentSrc()).toBe(MAIN_URL);
    });

    it('should fall back to fallback asset after both URLs fail', () => {
      host.image.set(makeImage({ mainUrl: MAIN_URL, thumbnailUrl: THUMBNAIL_URL }));
      fixture.detectChanges();
      component.displayMode.set('main');

      img().triggerEventHandler('error', {});
      img().triggerEventHandler('error', {});

      expect(component.displayMode()).toBe('fallback');
      expect(component.currentSrc()).toBe(FALLBACK_SRC);
    });

    it('should fall back to fallback asset when image is null', () => {
      host.image.set(null);
      fixture.detectChanges();

      img().triggerEventHandler('error', {});

      expect(component.displayMode()).toBe('fallback');
      expect(component.currentSrc()).toBe(FALLBACK_SRC);
    });
  });

  describe('loaded output', () => {
    it('should emit loaded when the img element fires load', () => {
      host.image.set(makeImage({ mainUrl: MAIN_URL }));
      fixture.detectChanges();
      const emitSpy = vi.fn();
      component.loaded.subscribe(emitSpy);

      img().triggerEventHandler('load', {});

      expect(emitSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('fallback chain', () => {
    it('should go straight to the fallback asset when the only main URL fails', () => {
      host.image.set(makeImage({ mainUrl: MAIN_URL }));
      fixture.detectChanges();

      img().triggerEventHandler('error', {});

      expect(component.displayMode()).toBe('fallback');
    });

    it('should go straight to the fallback asset when the only thumbnail fails', () => {
      host.image.set(makeImage({ thumbnailUrl: THUMBNAIL_URL }));
      fixture.detectChanges();

      img().triggerEventHandler('error', {});

      expect(component.displayMode()).toBe('fallback');
    });

    it('should stay on the fallback asset if even that fails', () => {
      host.image.set(makeImage());
      fixture.detectChanges();

      img().triggerEventHandler('error', {});

      expect(component.displayMode()).toBe('fallback');
      expect(component.currentSrc()).toBe(FALLBACK_SRC);
    });
  });

  describe('full-size upgrade', () => {
    let preloaders: HTMLImageElement[];

    beforeEach(() => {
      preloaders = [];
      vi.spyOn(window, 'Image').mockImplementation(function () {
        const preloader = document.createElement('img');
        preloaders.push(preloader);
        return preloader;
      });
    });

    const showThumbnail = (): void => {
      host.image.set(makeImage({ mainUrl: MAIN_URL, thumbnailUrl: THUMBNAIL_URL }));
      fixture.detectChanges();
      img().triggerEventHandler('load', {});
      fixture.detectChanges();
    };

    it('should preload the main image once the thumbnail shows, then swap it in', () => {
      showThumbnail();
      img().triggerEventHandler('load', {});

      preloaders[0].dispatchEvent(new Event('load'));
      fixture.detectChanges();

      expect(preloaders.length).toBe(1);
      expect(preloaders[0].src).toBe(MAIN_URL);
      expect(component.displayMode()).toBe('main');
      expect(img().nativeElement.src).toBe(MAIN_URL);
      expect(component.blurred()).toBe(false);
    });

    it('should keep the thumbnail, unblurred, when the main image fails to preload', () => {
      showThumbnail();

      preloaders[0].dispatchEvent(new Event('error'));
      img().triggerEventHandler('load', {});
      fixture.detectChanges();

      expect(preloaders.length).toBe(1);
      expect(component.displayMode()).toBe('thumbnail');
      expect(img().nativeElement.src).toBe(THUMBNAIL_URL);
      expect(component.blurred()).toBe(false);
    });

    it('should preload a main URL that arrives after the thumbnail has shown', () => {
      host.image.set(makeImage({ thumbnailUrl: THUMBNAIL_URL }));
      fixture.detectChanges();
      img().triggerEventHandler('load', {});

      host.image.set(makeImage({ mainUrl: MAIN_URL, thumbnailUrl: THUMBNAIL_URL }));
      fixture.detectChanges();
      preloaders[0].dispatchEvent(new Event('load'));
      fixture.detectChanges();

      expect(component.displayMode()).toBe('main');
      expect(img().nativeElement.src).toBe(MAIN_URL);
    });

    it('should ignore a preload that was cancelled by a new image', () => {
      showThumbnail();
      const { onload, onerror } = preloaders[0];

      host.image.set(
        makeImage({ id: 'img-2', mainUrl: 'https://example.com/other.jpg' }),
      );
      fixture.detectChanges();
      onload?.call(preloaders[0], new Event('load'));
      onerror?.call(preloaders[0], new Event('error'));

      expect(preloaders[0].onload).toBeNull();
      expect(component.currentSrc()).toBe('https://example.com/other.jpg');
    });

    it('should cancel the preload when destroyed', () => {
      showThumbnail();

      fixture.destroy();

      expect(preloaders[0].onload).toBeNull();
      expect(preloaders[0].onerror).toBeNull();
    });
  });
});
