import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { firstValueFrom, take } from 'rxjs';

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { MOCK_IMAGES } from '@app/mocks/images.mock';
import { MetaAndTitleService, StoreRequestService } from '@app/services';
import { AuthSelectors } from '@app/store/auth';
import { ImagesActions, ImagesSelectors } from '@app/store/images';
import { query } from '@app/utils';

import { PhotoGalleryPageComponent } from './photo-gallery-page.component';

describe('PhotoGalleryPageComponent', () => {
  let fixture: ComponentFixture<PhotoGalleryPageComponent>;
  let component: PhotoGalleryPageComponent;

  let metaAndTitleService: MetaAndTitleService;
  let store: MockStore;

  let dispatchSpy: MockInstance;
  let updateDescriptionSpy: MockInstance;
  let updateTitleSpy: MockInstance;

  const mockPhotoImages = MOCK_IMAGES.slice(0, 5);
  const mockIsAdmin = true;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PhotoGalleryPageComponent],
      providers: [
        {
          provide: MetaAndTitleService,
          useValue: {
            updateTitle: vi.fn(),
            updateDescription: vi.fn(),
          },
        },
        { provide: StoreRequestService, useValue: { dispatch: vi.fn() } },
        provideMockStore(),
        provideRouter([]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PhotoGalleryPageComponent);
    component = fixture.componentInstance;

    metaAndTitleService = TestBed.inject(MetaAndTitleService);
    store = TestBed.inject(MockStore);

    dispatchSpy = vi.spyOn(store, 'dispatch');
    updateDescriptionSpy = vi.spyOn(metaAndTitleService, 'updateDescription');
    updateTitleSpy = vi.spyOn(metaAndTitleService, 'updateTitle');

    store.overrideSelector(AuthSelectors.selectIsAdmin, mockIsAdmin);
    store.overrideSelector(ImagesSelectors.selectPhotoImages, mockPhotoImages);
    store.overrideSelector(ImagesSelectors.selectMetadataStatus, 'loaded');
    store.refreshState();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    beforeEach(() => {
      component.ngOnInit();
    });

    it('should set meta title and description', () => {
      expect(updateTitleSpy).toHaveBeenCalledTimes(1);
      expect(updateTitleSpy).toHaveBeenCalledWith('Photo Gallery');
      expect(updateDescriptionSpy).toHaveBeenCalledTimes(1);
    });

    it('should set viewModel$ with expected data', async () => {
      const vm = await firstValueFrom(component.viewModel$!.pipe(take(1)));

      expect(vm).toStrictEqual({
        isAdmin: mockIsAdmin,
        photoImages: mockPhotoImages,
        status: 'loaded',
      });
    });
  });

  describe('onRetry', () => {
    it('should fetch the photos again', () => {
      component.onRetry();

      expect(dispatchSpy).toHaveBeenCalledTimes(1);
      expect(dispatchSpy).toHaveBeenCalledWith(
        ImagesActions.fetchAllImagesMetadataRequested(),
      );
    });
  });

  describe('template rendering', () => {
    describe('when viewModel$ is undefined', () => {
      it('should not render any content', () => {
        expect(query(fixture.debugElement, 'lcc-page-header')).toBeFalsy();
        expect(query(fixture.debugElement, 'lcc-photo-grid')).toBeFalsy();
      });
    });

    describe('when viewModel$ is defined', () => {
      beforeEach(() => {
        fixture.detectChanges();
      });

      it('should render page header and photo grid', () => {
        expect(query(fixture.debugElement, 'lcc-page-header')).toBeTruthy();
        expect(query(fixture.debugElement, 'lcc-photo-grid')).toBeTruthy();
      });
    });

    describe('while the photos load', () => {
      beforeEach(() => {
        store.overrideSelector(ImagesSelectors.selectMetadataStatus, 'loading');
        store.refreshState();
        fixture.detectChanges();
      });

      it('should render the photo grid as a skeleton', () => {
        const photoGrid = query(fixture.debugElement, 'lcc-photo-grid');

        expect(photoGrid.componentInstance.isLoading()).toBe(true);
        expect(query(fixture.debugElement, 'lcc-load-failed')).toBeFalsy();
      });
    });

    describe('when the photos fail to load', () => {
      beforeEach(() => {
        store.overrideSelector(ImagesSelectors.selectMetadataStatus, 'failed');
        store.refreshState();
        fixture.detectChanges();
      });

      it('should render a failure panel in place of the photo grid', () => {
        expect(query(fixture.debugElement, 'lcc-load-failed')).toBeTruthy();
        expect(query(fixture.debugElement, 'lcc-photo-grid')).toBeFalsy();
      });

      it('should fetch the photos again on retry', () => {
        query(fixture.debugElement, 'lcc-load-failed').triggerEventHandler('retry');

        expect(dispatchSpy).toHaveBeenCalledWith(
          ImagesActions.fetchAllImagesMetadataRequested(),
        );
      });
    });
  });
});
