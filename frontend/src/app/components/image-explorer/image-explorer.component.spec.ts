import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { firstValueFrom } from 'rxjs';

import { ChangeDetectorRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';

import { BasicDialogComponent } from '@app/components/basic-dialog/basic-dialog.component';
import { AdminControlsDirective } from '@app/directives/admin-controls.directive';
import { MOCK_IMAGES } from '@app/mocks/images.mock';
import { DataPaginationOptions, Image } from '@app/models';
import { DialogService, StoreRequestService } from '@app/services';
import { ImagesActions, ImagesSelectors } from '@app/store/images';
import { lastOpenedDialog, query, queryAll, queryTextContent } from '@app/utils';

import { ImageExplorerComponent } from './image-explorer.component';

describe('ImageExplorerComponent', () => {
  let fixture: ComponentFixture<ImageExplorerComponent>;
  let component: ImageExplorerComponent;

  let changeDetectorRef: ChangeDetectorRef;
  let dialogService: DialogService;
  let store: MockStore;

  let dialogOpenSpy: MockInstance;
  let dialogResultSpy: MockInstance;
  let dispatchSpy: MockInstance;
  let storeRequestSpy: Mock;

  const mockImages = MOCK_IMAGES;
  const mockOptions: DataPaginationOptions<Image> = {
    page: 1,
    pageSize: 20,
    sortBy: 'modificationInfo',
    sortOrder: 'desc',
    filters: null,
    search: '',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminControlsDirective, ImageExplorerComponent],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: { paramMap: [] },
        },
        {
          provide: DialogService,
          useValue: { open: vi.fn() },
        },
        {
          provide: StoreRequestService,
          useValue: { dispatch: vi.fn().mockResolvedValue(null) },
        },
        provideMockStore(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ImageExplorerComponent);
    component = fixture.componentInstance;

    changeDetectorRef = fixture.debugElement.injector.get(ChangeDetectorRef);
    dialogService = TestBed.inject(DialogService);
    store = TestBed.inject(MockStore);

    store.overrideSelector(ImagesSelectors.selectFilteredImages, mockImages);
    store.overrideSelector(ImagesSelectors.selectFilteredCount, mockImages.length);
    store.overrideSelector(ImagesSelectors.selectTotalCount, mockImages.length);
    store.overrideSelector(ImagesSelectors.selectOptions, mockOptions);
    store.overrideSelector(ImagesSelectors.selectFilteredThumbnailsStatus, 'loaded');

    dialogOpenSpy = vi.spyOn(dialogService, 'open');
    dialogResultSpy = vi.spyOn(component.dialogResult, 'emit');
    dispatchSpy = vi.spyOn(store, 'dispatch');
    storeRequestSpy = vi.mocked(TestBed.inject(StoreRequestService).dispatch);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('initialization', () => {
    it('should be selectable by default', () => {
      fixture.detectChanges();
      expect(component.selectable).toBe(true);
    });

    it('should fetch the thumbnails for the current options', () => {
      fixture.detectChanges();

      expect(dispatchSpy).toHaveBeenCalledWith(
        ImagesActions.fetchFilteredThumbnailsRequested(),
      );
    });

    it('should size the skeleton to the page size', async () => {
      component.ngOnInit();

      const vm = await firstValueFrom(component.viewModel$!);

      expect(vm.skeletonCards).toHaveLength(20);
    });

    it('should cap the skeleton at a screenful when showing every image', async () => {
      store.overrideSelector(ImagesSelectors.selectOptions, {
        ...mockOptions,
        pageSize: -1,
      });
      component.ngOnInit();

      const vm = await firstValueFrom(component.viewModel$!);

      expect(vm.skeletonCards).toHaveLength(20);
    });
  });

  describe('admin controls', () => {
    it('should return correct admin controls config', () => {
      const config = component.getAdminControlsConfig(mockImages[0]);

      expect(config.buttonSize).toBe(34);
      expect(config.editPath).toEqual(['image', 'edit', mockImages[0].id.split('-')[0]]);
      expect(config.editInNewTab).toBe(true);
      expect(config.isDeleteDisabled).toBe(false); // mockImages[0] has no article appearances
      expect(config.deleteDisabledReason).toBe(
        'Image cannot be delete while it is used in an article',
      );
      expect(config.itemName).toBe(mockImages[0].filename);
    });

    it('should disable delete for images used in articles', () => {
      // Modify a mock image to have article appearances
      const imageWithArticles = { ...mockImages[0], articleAppearances: 2 };
      const config = component.getAdminControlsConfig(imageWithArticles);

      expect(config.isDeleteDisabled).toBe(true);
    });
  });

  describe('image deletion', () => {
    it('should delete the image from the confirmation dialog', async () => {
      await component.onDeleteImage(mockImages[1]);
      await lastOpenedDialog(dialogOpenSpy).confirmAction?.();

      expect(dialogOpenSpy).toHaveBeenCalledWith({
        componentType: BasicDialogComponent,
        inputs: {
          dialog: expect.objectContaining({
            title: 'Confirm',
            body: `Delete ${mockImages[1].filename}?`,
            confirmButtonText: 'Delete',
            confirmButtonType: 'warning',
          }),
        },
        isModal: true,
      });
      expect(storeRequestSpy).toHaveBeenCalledWith(
        ImagesActions.deleteImageRequested({ image: mockImages[1] }),
        [ImagesActions.deleteImageSucceeded, ImagesActions.deleteImageFailed],
      );
      expect(dialogResultSpy).not.toHaveBeenCalled();
    });

    it('should not delete anything until the dialog is confirmed', async () => {
      dialogOpenSpy.mockResolvedValue('cancel');

      await component.onDeleteImage(mockImages[1]);

      expect(storeRequestSpy).not.toHaveBeenCalled();
      expect(dialogResultSpy).not.toHaveBeenCalled();
    });
  });

  describe('onRetry', () => {
    it('should fetch the thumbnails again', () => {
      component.onRetry();

      expect(dispatchSpy).toHaveBeenCalledTimes(1);
      expect(dispatchSpy).toHaveBeenCalledWith(
        ImagesActions.fetchFilteredThumbnailsRequested(),
      );
    });
  });

  describe('template rendering', () => {
    beforeEach(() => {
      // Set up mock data and re-render component
      store.overrideSelector(ImagesSelectors.selectAllImages, mockImages);
      fixture.detectChanges();
    });

    it('should render images from the store', () => {
      expect(queryAll(fixture.debugElement, '.image-card').length).toBe(
        mockImages.length,
      );
    });

    it('should apply selectable class when selectable is true', () => {
      component.selectable = true;
      fixture.detectChanges();

      expect(query(fixture.debugElement, '.image-card').classes['selectable']).toBe(true);
    });

    it('should not apply selectable class when selectable is false', () => {
      component.selectable = false;
      changeDetectorRef.markForCheck();
      fixture.detectChanges();

      expect(query(fixture.debugElement, '.image-card').classes['selectable']).toBe(
        undefined,
      );
    });

    it('should emit dialogResult with image id when clicked and selectable is true', () => {
      component.selectable = true;
      fixture.detectChanges();

      query(fixture.debugElement, '.image-card').triggerEventHandler('click');

      expect(dialogResultSpy).toHaveBeenCalledWith(mockImages[0].id);
    });

    it('should not emit dialogResult when clicked and selectable is false', () => {
      component.selectable = false;
      fixture.detectChanges();

      query(fixture.debugElement, '.image-card').triggerEventHandler('click');

      expect(dialogResultSpy).not.toHaveBeenCalled();
    });

    it('should display image metadata', () => {
      expect(queryTextContent(fixture.debugElement, '.caption span')).toBe(
        mockImages[0].caption,
      );
      expect(queryTextContent(fixture.debugElement, '.filename span')).toBe(
        mockImages[0].filename,
      );

      // Actual text will depend on formatDate pipe implementation
      expect(query(fixture.debugElement, '.upload-date span')).toBeTruthy();
    });

    describe('while the thumbnails load', () => {
      beforeEach(() => {
        store.overrideSelector(ImagesSelectors.selectFilteredThumbnailsStatus, 'loading');
        store.refreshState();
        fixture.detectChanges();
      });

      it('should render a skeleton card for each image on the page', () => {
        expect(queryAll(fixture.debugElement, '.image-card')).toHaveLength(20);
        expect(queryAll(fixture.debugElement, '.image-card ea-skeleton')).toHaveLength(
          20 * 4,
        );
        expect(query(fixture.debugElement, 'lcc-image')).toBeFalsy();
      });

      it('should mark the grid as busy', () => {
        expect(query(fixture.debugElement, '.image-grid').attributes['aria-busy']).toBe(
          'true',
        );
      });

      it('should not let skeleton cards be selected', () => {
        query(fixture.debugElement, '.image-card').triggerEventHandler('click');

        expect(dialogResultSpy).not.toHaveBeenCalled();
      });
    });

    describe('when the thumbnails fail to load', () => {
      beforeEach(() => {
        store.overrideSelector(ImagesSelectors.selectFilteredThumbnailsStatus, 'failed');
        store.refreshState();
        fixture.detectChanges();
      });

      it('should render a failure panel in place of the image grid', () => {
        expect(query(fixture.debugElement, 'lcc-load-failed')).toBeTruthy();
        expect(query(fixture.debugElement, '.image-grid')).toBeFalsy();
        expect(query(fixture.debugElement, 'lcc-data-toolbar')).toBeTruthy();
      });

      it('should fetch the thumbnails again on retry', () => {
        dispatchSpy.mockClear();

        query(fixture.debugElement, 'lcc-load-failed').triggerEventHandler('retry');

        expect(dispatchSpy).toHaveBeenCalledWith(
          ImagesActions.fetchFilteredThumbnailsRequested(),
        );
      });
    });
  });
});
