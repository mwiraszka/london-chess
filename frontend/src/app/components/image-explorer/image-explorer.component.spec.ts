import { DialogRef, DialogService, PAGE_SIZE_ALL } from '@eagami/ui';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { firstValueFrom } from 'rxjs';

import { ChangeDetectorRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';

import { AdminControlsDirective } from '@app/directives/admin-controls.directive';
import { MOCK_IMAGES } from '@app/mocks/images.mock';
import { DataPaginationOptions, Id, Image } from '@app/models';
import { DeletionService, StoreRequestService } from '@app/services';
import { ImagesActions, ImagesSelectors } from '@app/store/images';
import { closedDialogRef, query, queryAll, queryTextContent } from '@app/utils';

import { ImageExplorerComponent } from './image-explorer.component';

describe('ImageExplorerComponent', () => {
  let fixture: ComponentFixture<ImageExplorerComponent>;
  let component: ImageExplorerComponent;

  let changeDetectorRef: ChangeDetectorRef;
  let store: MockStore;

  let closeSpy: MockInstance;
  let dispatchSpy: MockInstance;

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
    const dialogRef = new DialogRef<Id>();
    closeSpy = vi.spyOn(dialogRef, 'close');

    await TestBed.configureTestingModule({
      imports: [AdminControlsDirective, ImageExplorerComponent],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: { paramMap: [] },
        },
        { provide: DialogRef, useValue: dialogRef },
        {
          provide: DialogService,
          useValue: { open: vi.fn(() => closedDialogRef()) },
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
    store = TestBed.inject(MockStore);

    store.overrideSelector(ImagesSelectors.selectFilteredImages, mockImages);
    store.overrideSelector(ImagesSelectors.selectFilteredCount, mockImages.length);
    store.overrideSelector(ImagesSelectors.selectOptions, mockOptions);
    store.overrideSelector(ImagesSelectors.selectFilteredThumbnailsStatus, 'loaded');
    store.overrideSelector(ImagesSelectors.selectIsFetchingFiltered, false);

    dispatchSpy = vi.spyOn(store, 'dispatch');
  });

  afterEach(() => store.resetSelectors());

  describe('initialization', () => {
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
  });

  describe('admin controls', () => {
    it('should return correct admin controls config', () => {
      const config = component.getAdminControlsConfig(mockImages[0]);

      expect(config.buttonSize).toBe(34);
      expect(config.editPath).toEqual(['image', 'edit', mockImages[0].id.split('-')[0]]);
      expect(config.editInNewTab).toBe(true);
      expect(config.isDeleteDisabled).toBe(false); // mockImages[0] has no article appearances
      expect(config.deleteDisabledReason).toBe(
        'Image cannot be deleted while it is used in an article',
      );
      expect(config.itemName).toBe(mockImages[0].filename);
    });

    it('should delete an image from its admin controls', () => {
      const deleteImage = vi
        .spyOn(TestBed.inject(DeletionService), 'deleteImage')
        .mockResolvedValue(false);

      component.getAdminControlsConfig(mockImages[0]).deleteCb();

      expect(deleteImage).toHaveBeenCalledExactlyOnceWith(mockImages[0]);
    });

    it('should disable delete for images used in articles', () => {
      // Modify a mock image to have article appearances
      const imageWithArticles = { ...mockImages[0], articleAppearances: 2 };
      const config = component.getAdminControlsConfig(imageWithArticles);

      expect(config.isDeleteDisabled).toBe(true);
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

    it('should be selectable by default', () => {
      expect(query(fixture.debugElement, '.image-card').classes['selectable']).toBe(true);
    });

    it('should not apply selectable class when selectable is false', () => {
      fixture.componentRef.setInput('selectable', false);
      changeDetectorRef.markForCheck();
      fixture.detectChanges();

      expect(query(fixture.debugElement, '.image-card').classes['selectable']).toBe(
        undefined,
      );
    });

    it('should answer with the image id when clicked and selectable is true', () => {
      fixture.componentRef.setInput('selectable', true);
      fixture.detectChanges();

      query(fixture.debugElement, '.image-card').triggerEventHandler('click');

      expect(closeSpy).toHaveBeenCalledWith(mockImages[0].id);
    });

    it('should not answer when clicked and selectable is false', () => {
      fixture.componentRef.setInput('selectable', false);
      fixture.detectChanges();

      query(fixture.debugElement, '.image-card').triggerEventHandler('click');

      expect(closeSpy).not.toHaveBeenCalled();
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
          20 * 8,
        );
        expect(queryAll(fixture.debugElement, '.image-card label')).toHaveLength(20 * 6);
        expect(query(fixture.debugElement, 'lcc-image')).toBeFalsy();
      });

      it('should mark the grid as busy', () => {
        expect(query(fixture.debugElement, '.image-grid').attributes['aria-busy']).toBe(
          'true',
        );
      });

      it('should not let skeleton cards be selected', () => {
        query(fixture.debugElement, '.image-card').triggerEventHandler('click');

        expect(closeSpy).not.toHaveBeenCalled();
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
        expect(query(fixture.debugElement, '.filters')).toBeTruthy();
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

  describe('search and pagination', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      fixture.detectChanges();
      dispatchSpy.mockClear();
    });

    const searchInput = (): HTMLInputElement =>
      query(fixture.debugElement, '.filters__search input').nativeElement;

    it('should search from the first page once typing pauses', () => {
      searchInput().value = 'board';
      searchInput().dispatchEvent(new Event('input'));

      vi.advanceTimersByTime(299);
      const beforePause = dispatchSpy.mock.calls.length;
      vi.advanceTimersByTime(1);

      expect(beforePause).toBe(0);
      expect(dispatchSpy).toHaveBeenCalledWith(
        ImagesActions.paginationOptionsChanged({
          options: { ...mockOptions, search: 'board', page: 1 },
        }),
      );
    });

    it('should show a search set elsewhere without searching again', () => {
      store.overrideSelector(ImagesSelectors.selectOptions, {
        ...mockOptions,
        search: 'album',
      });
      store.refreshState();
      fixture.detectChanges();
      vi.advanceTimersByTime(300);

      expect(searchInput().value).toBe('album');
      expect(dispatchSpy).not.toHaveBeenCalled();
    });

    it('should fetch the chosen page', () => {
      query(fixture.debugElement, 'ea-paginator').triggerEventHandler('changed', {
        page: 3,
        pageSize: 50,
      });

      expect(dispatchSpy).toHaveBeenCalledWith(
        ImagesActions.paginationOptionsChanged({
          options: { ...mockOptions, page: 3, pageSize: 50 },
        }),
      );
    });

    it('should size an all-images skeleton to the smallest page before the count is known', async () => {
      store.overrideSelector(ImagesSelectors.selectOptions, {
        ...mockOptions,
        pageSize: PAGE_SIZE_ALL,
      });
      store.overrideSelector(ImagesSelectors.selectFilteredCount, null);
      store.refreshState();

      const vm = await firstValueFrom(component.viewModel$!);

      expect(vm.skeletonCards).toHaveLength(10);
    });
  });

  it('should say so when no images match the search', () => {
    store.overrideSelector(ImagesSelectors.selectFilteredImages, []);
    store.overrideSelector(ImagesSelectors.selectFilteredCount, 0);

    fixture.detectChanges();

    expect(query(fixture.debugElement, 'ea-empty-state')).not.toBeNull();
    expect(query(fixture.debugElement, '.image-grid')).toBeNull();
  });
});
