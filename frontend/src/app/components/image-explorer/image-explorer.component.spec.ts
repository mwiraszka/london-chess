import { MockStore, provideMockStore } from '@ngrx/store/testing';

import { ChangeDetectorRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';

import { BasicDialogComponent } from '@app/components/basic-dialog/basic-dialog.component';
import { AdminControlsDirective } from '@app/directives/admin-controls.directive';
import { MOCK_IMAGES } from '@app/mocks/images.mock';
import { DialogService } from '@app/services';
import { ImagesActions, ImagesSelectors } from '@app/store/images';
import { query, queryAll, queryTextContent } from '@app/utils';

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

  const mockImages = MOCK_IMAGES;

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
    store.overrideSelector(ImagesSelectors.selectOptions, {
      page: 1,
      pageSize: 20,
      sortBy: 'modificationInfo' as keyof (typeof mockImages)[0],
      sortOrder: 'desc',
      filters: null,
      search: '',
    });

    dialogOpenSpy = vi.spyOn(dialogService, 'open');
    dialogResultSpy = vi.spyOn(component.dialogResult, 'emit');
    dispatchSpy = vi.spyOn(store, 'dispatch');
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('initialization', () => {
    it('should be selectable by default', () => {
      fixture.detectChanges();
      expect(component.selectable).toBe(true);
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
    it('should open confirmation dialog and dispatch delete action when confirmed', async () => {
      dialogOpenSpy.mockResolvedValue('confirm');

      await component.onDeleteImage(mockImages[1]);

      expect(dialogOpenSpy).toHaveBeenCalledWith({
        componentType: BasicDialogComponent,
        inputs: {
          dialog: {
            title: 'Confirm',
            body: `Delete ${mockImages[1].filename}?`,
            confirmButtonText: 'Delete',
            confirmButtonType: 'warning',
          },
        },
        isModal: true,
      });
      expect(dispatchSpy).toHaveBeenCalledWith(
        ImagesActions.deleteImageRequested({ image: mockImages[1] }),
      );
      expect(dialogResultSpy).not.toHaveBeenCalled();
    });

    it('should not dispatch delete action when dialog is cancelled', async () => {
      // Reset all mocks before this test
      vi.clearAllMocks();
      dialogOpenSpy.mockResolvedValue('cancel');

      await component.onDeleteImage(mockImages[1]);

      expect(dialogOpenSpy).toHaveBeenCalledWith({
        componentType: BasicDialogComponent,
        inputs: {
          dialog: {
            title: 'Confirm',
            body: `Delete ${mockImages[1].filename}?`,
            confirmButtonText: 'Delete',
            confirmButtonType: 'warning',
          },
        },
        isModal: true,
      });
      expect(dispatchSpy).not.toHaveBeenCalled();
      expect(dialogResultSpy).not.toHaveBeenCalled();
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
  });
});
