import { MockStore, provideMockStore } from '@ngrx/store/testing';

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BasicDialogComponent } from '@app/components/basic-dialog/basic-dialog.component';
import { MOCK_IMAGES } from '@app/mocks/images.mock';
import { Image } from '@app/models';
import { AdminControlsService, DialogService, StoreRequestService } from '@app/services';
import { ImagesActions, ImagesSelectors } from '@app/store/images';
import { lastOpenedDialog, query, queryTextContent } from '@app/utils';

import { ImageViewerComponent } from './image-viewer.component';

describe('ImageViewerComponent', () => {
  let fixture: ComponentFixture<ImageViewerComponent>;
  let component: ImageViewerComponent;
  let store: MockStore;

  let adminControlsCloseSpy: MockInstance;
  let adminControlsOpenSpy: MockInstance;
  let dialogOpenSpy: Mock;
  let dialogResultSpy: MockInstance;
  let dispatchSpy: MockInstance;
  let storeRequestSpy: Mock;

  const createViewer = (images: Image[] = MOCK_IMAGES, isAdmin = true): void => {
    fixture = TestBed.createComponent(ImageViewerComponent);
    component = fixture.componentInstance;
    dialogResultSpy = vi.spyOn(component.dialogResult, 'emit');

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
    const event = new KeyboardEvent(type, { key, cancelable: true });
    document.dispatchEvent(event);
    fixture.detectChanges();
    return event;
  };

  beforeEach(async () => {
    vi.useFakeTimers();

    await TestBed.configureTestingModule({
      imports: [ImageViewerComponent],
      providers: [
        provideMockStore(),
        { provide: DialogService, useValue: { open: vi.fn() } },
        {
          provide: StoreRequestService,
          useValue: { dispatch: vi.fn().mockResolvedValue(null) },
        },
      ],
    }).compileComponents();

    store = TestBed.inject(MockStore);
    store.overrideSelector(ImagesSelectors.selectAllImages, MOCK_IMAGES);

    dialogOpenSpy = vi.mocked(TestBed.inject(DialogService).open);
    dispatchSpy = vi.spyOn(store, 'dispatch');
    storeRequestSpy = vi.mocked(TestBed.inject(StoreRequestService).dispatch);
    adminControlsCloseSpy = vi.spyOn(TestBed.inject(AdminControlsService), 'close');
    adminControlsOpenSpy = vi
      .spyOn(TestBed.inject(AdminControlsService), 'open')
      .mockImplementation(() => undefined);
  });

  afterEach(() => fixture.destroy());

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
      query(fixture.debugElement, '.next-image-button').nativeElement.click();
      const afterFirst = shownImageId();
      for (let i = 1; i < MOCK_IMAGES.length; i++) {
        component.onNextImage();
      }

      expect(afterFirst).toBe(MOCK_IMAGES[1].id);
      expect(shownImageId()).toBe(MOCK_IMAGES[0].id);
      expect(adminControlsCloseSpy).toHaveBeenCalledTimes(MOCK_IMAGES.length);
    });

    it('should go to the previous image, and from the first round to the last', () => {
      query(fixture.debugElement, '.previous-image-button').nativeElement.click();
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
      vi.advanceTimersByTime(0);

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
      vi.advanceTimersByTime(0);

      const arrowUp = press('keydown', 'ArrowUp');
      const letter = press('keydown', 'a');
      press('keyup', 'a');

      expect(arrowUp.defaultPrevented).toBe(true);
      expect(letter.defaultPrevented).toBe(false);
      expect(shownImageId()).toBe(MOCK_IMAGES[0].id);
    });

    it('should not move through a single image', () => {
      createViewer([MOCK_IMAGES[0]]);
      vi.advanceTimersByTime(0);

      press('keydown', 'ArrowRight');
      press('keyup', 'ArrowRight');
      press('keydown', 'ArrowLeft');
      press('keyup', 'ArrowLeft');

      expect(shownImageId()).toBe(MOCK_IMAGES[0].id);
      expect(adminControlsCloseSpy).not.toHaveBeenCalled();
    });

    it('should stop listening once destroyed', () => {
      createViewer();
      vi.advanceTimersByTime(0);

      fixture.destroy();
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));

      expect(adminControlsCloseSpy).not.toHaveBeenCalled();
    });
  });

  describe('template rendering', () => {
    it('should show the album name, and the caption once the image loads', () => {
      createViewer();

      const captionBefore = queryTextContent(fixture.debugElement, '.image-caption');
      query(fixture.debugElement, 'lcc-image').triggerEventHandler('loaded');
      fixture.detectChanges();

      expect(queryTextContent(fixture.debugElement, '.album-name')).toBe('Mock Album');
      expect(captionBefore).toBe('');
      expect(queryTextContent(fixture.debugElement, '.image-caption')).toBe(
        MOCK_IMAGES[0].caption,
      );
    });

    it('should enable the previous and next buttons for more than one image', () => {
      createViewer();

      expect(
        query(fixture.debugElement, '.previous-image-button').nativeElement.disabled,
      ).toBe(false);
      expect(
        query(fixture.debugElement, '.next-image-button').nativeElement.disabled,
      ).toBe(false);
    });

    it('should disable the previous and next buttons for a single image', () => {
      createViewer([MOCK_IMAGES[0]]);

      expect(
        query(fixture.debugElement, '.previous-image-button').nativeElement.disabled,
      ).toBe(true);
      expect(
        query(fixture.debugElement, '.next-image-button').nativeElement.disabled,
      ).toBe(true);
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

    it('should ask to confirm a delete from the controls', async () => {
      dialogOpenSpy.mockResolvedValue('cancel');

      await component.getAdminControlsConfig(MOCK_IMAGES[1]).deleteCb();

      expect(dialogOpenSpy).toHaveBeenCalledWith({
        componentType: BasicDialogComponent,
        inputs: {
          dialog: expect.objectContaining({
            title: 'Confirm',
            confirmButtonText: 'Delete',
            confirmButtonType: 'warning',
          }),
        },
        isModal: true,
      });
    });
  });

  describe('image deletion', () => {
    beforeEach(() => createViewer());

    describe('when the dialog is confirmed', () => {
      beforeEach(() => {
        dialogOpenSpy.mockImplementation(async () => {
          await lastOpenedDialog(dialogOpenSpy).confirmAction?.();
          return 'confirm';
        });
      });

      it('should delete the image from the confirmation dialog', async () => {
        await component.onDeleteImage(MOCK_IMAGES[1]);

        expect(storeRequestSpy).toHaveBeenCalledWith(
          ImagesActions.deleteImageRequested({ image: MOCK_IMAGES[1] }),
          [ImagesActions.deleteImageSucceeded, ImagesActions.deleteImageFailed],
        );
      });

      it('should close the viewer once the image is deleted', async () => {
        storeRequestSpy.mockResolvedValue(
          ImagesActions.deleteImageSucceeded({ image: MOCK_IMAGES[1] }),
        );

        await component.onDeleteImage(MOCK_IMAGES[1]);

        expect(dialogResultSpy).toHaveBeenCalledWith(null);
      });

      it('should keep the viewer open when the image fails to delete', async () => {
        storeRequestSpy.mockResolvedValue(
          ImagesActions.deleteImageFailed({
            image: MOCK_IMAGES[1],
            error: { name: 'LCCError', message: 'Unable to delete image.' },
          }),
        );

        await component.onDeleteImage(MOCK_IMAGES[1]);

        expect(dialogResultSpy).not.toHaveBeenCalled();
      });
    });

    it('should not delete anything when the dialog is cancelled', async () => {
      dialogOpenSpy.mockResolvedValue('cancel');

      await component.onDeleteImage(MOCK_IMAGES[1]);

      expect(storeRequestSpy).not.toHaveBeenCalled();
      expect(dialogResultSpy).not.toHaveBeenCalled();
    });
  });
});
