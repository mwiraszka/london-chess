import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { firstValueFrom, take } from 'rxjs';

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { MOCK_IMAGES } from '@app/mocks/images.mock';
import { MetaAndTitleService } from '@app/services';
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
    store.overrideSelector(
      ImagesSelectors.selectLastMetadataFetch,
      '2026-01-01T00:00:00.000Z',
    );
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
        isLoading: false,
        photoImages: mockPhotoImages,
      });
    });
  });

  describe('isLoading', () => {
    it('should be true when images have not been fetched yet', async () => {
      store.overrideSelector(ImagesSelectors.selectLastMetadataFetch, null);
      store.refreshState();
      component.ngOnInit();

      const vm = await firstValueFrom(component.viewModel$!.pipe(take(1)));

      expect(vm.isLoading).toBe(true);
    });

    it('should be false when images have been fetched', async () => {
      component.ngOnInit();

      const vm = await firstValueFrom(component.viewModel$!.pipe(take(1)));

      expect(vm.isLoading).toBe(false);
    });
  });

  describe('onRequestDeleteAlbum', () => {
    it('should dispatch deleteAlbumRequested action', () => {
      const album = 'Test Album';
      component.onRequestDeleteAlbum(album);

      expect(dispatchSpy).toHaveBeenCalledTimes(1);
      expect(dispatchSpy).toHaveBeenCalledWith(
        ImagesActions.deleteAlbumRequested({ album }),
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
  });
});
