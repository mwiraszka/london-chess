import { DialogRef, DialogService } from '@eagami/ui';
import { MockStore, provideMockStore } from '@ngrx/store/testing';

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MOCK_IMAGES } from '@app/mocks/images.mock';
import { Image } from '@app/models';
import {
  AdminControlsService,
  DeletionService,
  LoadedImagesService,
  StoreRequestService,
} from '@app/services';
import { ImagesActions, ImagesSelectors } from '@app/store/images';
import { closedDialogRef, query, queryTextContent } from '@app/utils';

import { ImageViewerComponent } from './image-viewer.component';

describe('ImageViewerComponent', () => {
  let fixture: ComponentFixture<ImageViewerComponent>;
  let component: ImageViewerComponent;
  let store: MockStore;

  let adminControlsCloseSpy: MockInstance;
  let adminControlsOpenSpy: MockInstance;
  let closeSpy: MockInstance;
  let dispatchSpy: MockInstance;

  const createViewer = (images: Image[] = MOCK_IMAGES, isAdmin = true): void => {
    fixture = TestBed.createComponent(ImageViewerComponent);
    component = fixture.componentInstance;

    fixture.componentRef.setInput('album', 'Mock Album');
    fixture.componentRef.setInput('images', images);
    fixture.componentRef.setInput('isAdmin', isAdmin);
    fixture.detectChanges();
  };

  const isPrefetch = (
    arg: unknown,
  ): arg is ReturnType<typeof ImagesActions.fetchMainImageInBackgroundRequested> =>
    typeof arg === 'object' &&
    arg !== null &&
    'type' in arg &&
    arg.type === ImagesActions.fetchMainImageInBackgroundRequested.type;

  const prefetched = (): string[] =>
    dispatchSpy.mock.calls
      .flat()
      .filter(isPrefetch)
      .map(action => action.imageId);

  const shownImageId = (): string => component.imageId;

  const press = (type: 'keydown' | 'keyup', key: string): KeyboardEvent => {
    const event = new KeyboardEvent(type, { key, bubbles: true, cancelable: true });
    query(fixture.debugElement, 'figure').nativeElement.dispatchEvent(event);
    fixture.detectChanges();
    return event;
  };

  const navButton = (name: 'previous' | 'next'): HTMLButtonElement =>
    query(fixture.debugElement, `.${name}-image-button button`).nativeElement;

  beforeEach(async () => {
    vi.useFakeTimers();
    const dialogRef = new DialogRef();
    closeSpy = vi.spyOn(dialogRef, 'close');

    await TestBed.configureTestingModule({
      imports: [ImageViewerComponent],
      providers: [
        provideMockStore(),
        { provide: DialogRef, useValue: dialogRef },
        { provide: DialogService, useValue: { open: vi.fn(() => closedDialogRef()) } },
        {
          provide: StoreRequestService,
          useValue: { dispatch: vi.fn().mockResolvedValue(null) },
        },
      ],
    }).compileComponents();

    store = TestBed.inject(MockStore);
    store.overrideSelector(ImagesSelectors.selectAllImages, MOCK_IMAGES);

    dispatchSpy = vi.spyOn(store, 'dispatch');
    adminControlsCloseSpy = vi.spyOn(TestBed.inject(AdminControlsService), 'close');
    adminControlsOpenSpy = vi
      .spyOn(TestBed.inject(AdminControlsService), 'open')
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    store.resetSelectors();
    fixture.destroy();
  });

  describe('fetching the shown image', () => {
    it('should fetch the first image when it has no main URL yet', () => {
      createViewer();

      expect(dispatchSpy).toHaveBeenCalledWith(
        ImagesActions.fetchMainImageRequested({ imageId: MOCK_IMAGES[0].id }),
      );
    });

    it('should fetch the image again when its stored main URL is expiring', () => {
      vi.setSystemTime(new Date('2026-03-14T12:00:00Z'));
      store.overrideSelector(ImagesSelectors.selectAllImages, [
        {
          ...MOCK_IMAGES[0],
          mainUrl: 'https://example.com/stale.jpg',
          urlExpirationDate: '2026-03-14T13:00:00Z',
        },
        ...MOCK_IMAGES.slice(1),
      ]);

      createViewer();

      expect(dispatchSpy).toHaveBeenCalledWith(
        ImagesActions.fetchMainImageRequested({ imageId: MOCK_IMAGES[0].id }),
      );
    });

    it('should not fetch the image while its stored main URL is fresh', () => {
      vi.setSystemTime(new Date('2026-03-14T12:00:00Z'));
      store.overrideSelector(ImagesSelectors.selectAllImages, [
        {
          ...MOCK_IMAGES[0],
          mainUrl: 'https://example.com/fresh.jpg',
          urlExpirationDate: '2026-03-14T23:00:00Z',
        },
        ...MOCK_IMAGES.slice(1),
      ]);

      createViewer();

      expect(dispatchSpy).not.toHaveBeenCalledWith(
        ImagesActions.fetchMainImageRequested({ imageId: MOCK_IMAGES[0].id }),
      );
    });

    it('should show nothing until the image is in the store', () => {
      store.overrideSelector(ImagesSelectors.selectAllImages, []);

      createViewer();

      expect(query(fixture.debugElement, 'figure')).toBeNull();
    });
  });

  describe('prefetching adjacent images', () => {
    it('should not prefetch anything for a single image', () => {
      createViewer([MOCK_IMAGES[0]]);

      vi.advanceTimersByTime(10_000);

      expect(prefetched()).toEqual([]);
    });

    it('should prefetch the other image of two', () => {
      createViewer(MOCK_IMAGES.slice(0, 2));

      vi.advanceTimersByTime(10_000);

      expect(prefetched()).toEqual([MOCK_IMAGES[1].id]);
    });

    it('should prefetch the next and then the previous image of three', () => {
      createViewer(MOCK_IMAGES.slice(0, 3));

      vi.advanceTimersByTime(1000);
      const first = prefetched();
      vi.advanceTimersByTime(10_000);

      expect(first).toEqual([MOCK_IMAGES[1].id]);
      expect(prefetched()).toEqual([MOCK_IMAGES[1].id, MOCK_IMAGES[2].id]);
    });

    it('should prefetch outward from the shown image, one a second', () => {
      const last = MOCK_IMAGES.length - 1;
      createViewer();

      vi.advanceTimersByTime(4000);

      expect(prefetched()).toEqual(
        [1, last, 2, last - 1].map(index => MOCK_IMAGES[index].id),
      );
    });

    it('should skip prefetching an image no longer in the album', () => {
      createViewer(MOCK_IMAGES.slice(0, 2));

      fixture.componentRef.setInput('images', [MOCK_IMAGES[0]]);
      vi.advanceTimersByTime(10_000);

      expect(prefetched()).toEqual([]);
    });
  });

  describe('navigation', () => {
    beforeEach(() => createViewer());

    it('should go to the next image, and from the last back to the first', () => {
      navButton('next').click();
      const afterFirst = shownImageId();
      for (let i = 1; i < MOCK_IMAGES.length; i++) {
        component.onNextImage();
      }

      expect(afterFirst).toBe(MOCK_IMAGES[1].id);
      expect(shownImageId()).toBe(MOCK_IMAGES[0].id);
      expect(adminControlsCloseSpy).toHaveBeenCalledTimes(MOCK_IMAGES.length);
    });

    it('should go to the previous image, and from the first round to the last', () => {
      navButton('previous').click();
      const afterFirst = shownImageId();
      component.onPreviousImage();

      expect(afterFirst).toBe(MOCK_IMAGES[MOCK_IMAGES.length - 1].id);
      expect(shownImageId()).toBe(MOCK_IMAGES[MOCK_IMAGES.length - 2].id);
      expect(adminControlsCloseSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('keyboard navigation', () => {
    it('should step through the images with the arrow keys and space, once per press', () => {
      createViewer();

      press('keydown', 'ArrowRight');
      press('keydown', 'ArrowRight');
      const whileHeld = shownImageId();
      const nextActive = query(fixture.debugElement, '.next-image-button').classes[
        'active'
      ];
      press('keyup', 'ArrowRight');
      press('keydown', ' ');
      press('keyup', ' ');
      press('keydown', 'ArrowLeft');
      press('keydown', 'ArrowLeft');
      const afterLeft = shownImageId();
      press('keyup', 'ArrowLeft');
      press('keydown', 'ArrowLeft');

      expect(whileHeld).toBe(MOCK_IMAGES[1].id);
      expect(nextActive).toBe(true);
      expect(afterLeft).toBe(MOCK_IMAGES[1].id);
      expect(shownImageId()).toBe(MOCK_IMAGES[0].id);
    });

    it('should take over the navigation keys but leave the others alone', () => {
      createViewer();

      const arrowUp = press('keydown', 'ArrowUp');
      const letter = press('keydown', 'a');
      press('keyup', 'a');

      expect(arrowUp.defaultPrevented).toBe(true);
      expect(letter.defaultPrevented).toBe(false);
      expect(shownImageId()).toBe(MOCK_IMAGES[0].id);
    });

    it('should not move through a single image', () => {
      createViewer([MOCK_IMAGES[0]]);

      press('keydown', 'ArrowRight');
      press('keyup', 'ArrowRight');
      press('keydown', 'ArrowLeft');
      press('keyup', 'ArrowLeft');

      expect(shownImageId()).toBe(MOCK_IMAGES[0].id);
      expect(adminControlsCloseSpy).not.toHaveBeenCalled();
    });
  });

  describe('moving between images', () => {
    let preloaders: HTMLImageElement[];
    let decodes: { resolve: () => void; reject: () => void }[];

    beforeEach(() => {
      preloaders = [];
      decodes = [];
      vi.spyOn(window, 'Image').mockImplementation(function () {
        const preloader = document.createElement('img');
        preloader.decode = () =>
          new Promise<void>((resolve, reject) =>
            decodes.push({
              resolve,
              reject: () => reject(new Error('Unable to decode')),
            }),
          );
        preloaders.push(preloader);
        return preloader;
      });
    });

    const shownId = (): string | undefined =>
      query(fixture.debugElement, 'figure lcc-image').componentInstance.image()?.id;

    it('should keep the image on screen until the next one has loaded', async () => {
      createViewer();

      component.onNextImage();
      fixture.detectChanges();
      const whileLoading = shownId();
      decodes[0].resolve();
      await fixture.whenStable();
      fixture.detectChanges();

      expect(whileLoading).toBe(MOCK_IMAGES[0].id);
      expect(preloaders[0].src).toBe(MOCK_IMAGES[1].mainUrl);
      expect(shownId()).toBe(MOCK_IMAGES[1].id);
      expect(TestBed.inject(LoadedImagesService).has(MOCK_IMAGES[1].mainUrl!)).toBe(true);
    });

    it('should still move on to an image that fails to load', async () => {
      createViewer();

      component.onNextImage();
      decodes[0].reject();
      await fixture.whenStable();
      fixture.detectChanges();

      expect(shownId()).toBe(MOCK_IMAGES[1].id);
      expect(TestBed.inject(LoadedImagesService).has(MOCK_IMAGES[1].mainUrl!)).toBe(
        false,
      );
    });

    it('should load the images either side once the shown one has loaded', () => {
      const last = MOCK_IMAGES.length - 1;
      createViewer();
      dispatchSpy.mockClear();

      query(fixture.debugElement, 'figure lcc-image').triggerEventHandler('loaded');

      expect(prefetched()).toContain(MOCK_IMAGES[last].id);
      expect(preloaders.map(preloader => preloader.src)).toEqual([
        MOCK_IMAGES[1].mainUrl,
      ]);
    });
  });

  describe('enlarging the image', () => {
    const enlarged = (): HTMLDialogElement =>
      query(fixture.debugElement, 'dialog.enlarged-image').nativeElement;

    beforeEach(() => {
      createViewer();
      query(fixture.debugElement, '.enlarge-button').nativeElement.click();
      fixture.detectChanges();
    });

    it('should show the image alone, outside the figure and its admin controls', () => {
      expect(enlarged().open).toBe(true);
      expect(enlarged().closest('figure')).toBeNull();
      expect(query(fixture.debugElement, 'dialog.enlarged-image lcc-image')).toBeTruthy();
      expect(enlarged().querySelector('button, figcaption')).toBeNull();
    });

    it('should shrink back to the viewer on a click anywhere', () => {
      enlarged().click();
      fixture.detectChanges();

      expect(enlarged().open).toBe(false);
      expect(query(fixture.debugElement, 'figure')).toBeTruthy();
    });

    it('should hand focus back to the figure rather than the image once closed', () => {
      enlarged().dispatchEvent(new Event('close'));
      fixture.detectChanges();

      expect(document.activeElement).toBe(
        query(fixture.debugElement, 'figure').nativeElement,
      );
      expect(query(fixture.debugElement, 'dialog.enlarged-image lcc-image')).toBeNull();
    });

    it('should leave a right click to the browser', () => {
      enlarged().dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }));
      fixture.detectChanges();

      expect(enlarged().open).toBe(true);
    });
  });

  describe('focus', () => {
    it('should rest on the figure, outside the tab order, when the viewer opens', () => {
      createViewer();

      const figure: HTMLElement = query(fixture.debugElement, 'figure').nativeElement;

      expect(figure.hasAttribute('autofocus')).toBe(true);
      expect(figure.tabIndex).toBe(-1);
    });
  });

  describe('template rendering', () => {
    it('should show the album name, and the caption once the image loads', () => {
      createViewer();

      const captionBefore = queryTextContent(fixture.debugElement, '.image-caption');
      query(fixture.debugElement, 'lcc-image').triggerEventHandler('loaded');
      fixture.detectChanges();

      expect(queryTextContent(fixture.debugElement, '[slot="header"]')).toBe(
        'Mock Album',
      );
      expect(
        query(fixture.debugElement, 'dialog').nativeElement.hasAttribute('open'),
      ).toBe(true);
      expect(captionBefore).toBe('');
      expect(queryTextContent(fixture.debugElement, '.image-caption')).toBe(
        MOCK_IMAGES[0].caption,
      );
    });

    it('should enable the previous and next buttons for more than one image', () => {
      createViewer();

      expect(navButton('previous').disabled).toBe(false);
      expect(navButton('next').disabled).toBe(false);
    });

    it('should disable the previous and next buttons for a single image', () => {
      createViewer([MOCK_IMAGES[0]]);

      expect(navButton('previous').disabled).toBe(true);
      expect(navButton('next').disabled).toBe(true);
    });

    it('should offer admin controls on the image to an admin only', () => {
      createViewer();
      query(fixture.debugElement, 'figure').nativeElement.dispatchEvent(
        new MouseEvent('contextmenu', { cancelable: true }),
      );
      fixture.destroy();
      createViewer(MOCK_IMAGES, false);

      query(fixture.debugElement, 'figure').nativeElement.dispatchEvent(
        new MouseEvent('contextmenu', { cancelable: true }),
      );

      expect(adminControlsOpenSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('admin controls', () => {
    beforeEach(() => createViewer());

    it('should disable deleting an image used in an article', () => {
      const unused = component.getAdminControlsConfig(MOCK_IMAGES[0]);
      const used = component.getAdminControlsConfig(MOCK_IMAGES[1]);

      expect(unused).toEqual(
        expect.objectContaining({
          editPath: ['image', 'edit', MOCK_IMAGES[0].id],
          editInNewTab: true,
          isDeleteDisabled: false,
          itemName: MOCK_IMAGES[0].filename,
        }),
      );
      expect(used.isDeleteDisabled).toBe(true);
    });
  });

  describe('image deletion', () => {
    beforeEach(() => createViewer());

    it('should close the viewer once the image is deleted', async () => {
      const deleteImage = vi
        .spyOn(TestBed.inject(DeletionService), 'deleteImage')
        .mockResolvedValue(true);

      await component.getAdminControlsConfig(MOCK_IMAGES[1]).deleteCb();

      expect(deleteImage).toHaveBeenCalledExactlyOnceWith(MOCK_IMAGES[1]);
      expect(closeSpy).toHaveBeenCalledTimes(1);
    });

    it('should keep the viewer open when the image is not deleted', async () => {
      vi.spyOn(TestBed.inject(DeletionService), 'deleteImage').mockResolvedValue(false);

      await component.getAdminControlsConfig(MOCK_IMAGES[1]).deleteCb();

      expect(closeSpy).not.toHaveBeenCalled();
    });
  });
});
