import { provideMockActions } from '@ngrx/effects/testing';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { pick, uniq } from 'lodash';
import { BehaviorSubject, EMPTY, firstValueFrom, take } from 'rxjs';

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';

import { IMAGE_FORM_DATA_PROPERTIES } from '@app/constants';
import { MOCK_IMAGES } from '@app/mocks/images.mock';
import { Image, ImageFormData, LccError } from '@app/models';
import { ImageFileService, MetaAndTitleService } from '@app/services';
import {
  ImagesActions,
  ImagesState,
  initialState as imagesInitialState,
} from '@app/store/images';
import { query } from '@app/utils';

import { AlbumEditorPageComponent } from './album-editor-page.component';

describe('AlbumEditorPageComponent', () => {
  let fixture: ComponentFixture<AlbumEditorPageComponent>;
  let component: AlbumEditorPageComponent;

  let metaAndTitleService: MetaAndTitleService;
  let mockParamsSubject: BehaviorSubject<{ album?: string }>;
  let store: MockStore;

  let dispatchSpy: MockInstance;
  let updateDescriptionSpy: MockInstance;
  let updateTitleSpy: MockInstance;

  beforeEach(async () => {
    mockParamsSubject = new BehaviorSubject<{ album?: string }>({});

    const mockImagesState: ImagesState = {
      ...imagesInitialState,
      ids: MOCK_IMAGES.map(image => image.id),
      entities: MOCK_IMAGES.reduce(
        (acc, image) => {
          acc[image.id] = {
            image,
            formData: pick(image, IMAGE_FORM_DATA_PROPERTIES),
          };
          return acc;
        },
        {} as Record<string, { image: Image; formData: ImageFormData }>,
      ),
      lastMetadataFetch: '2025-01-01T00:00:00.000Z',
      totalCount: MOCK_IMAGES.length,
    };

    await TestBed.configureTestingModule({
      imports: [AlbumEditorPageComponent],
      providers: [
        provideMockActions(() => EMPTY),
        {
          provide: ActivatedRoute,
          useValue: { params: mockParamsSubject.asObservable() },
        },
        {
          provide: ImageFileService,
          useValue: {},
        },
        {
          provide: MetaAndTitleService,
          useValue: {
            updateTitle: vi.fn(),
            updateDescription: vi.fn(),
          },
        },
        provideMockStore({
          initialState: {
            imagesState: mockImagesState,
          },
        }),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AlbumEditorPageComponent);
    component = fixture.componentInstance;

    metaAndTitleService = TestBed.inject(MetaAndTitleService);
    store = TestBed.inject(MockStore);

    dispatchSpy = vi.spyOn(store, 'dispatch');
    updateDescriptionSpy = vi.spyOn(metaAndTitleService, 'updateDescription');
    updateTitleSpy = vi.spyOn(metaAndTitleService, 'updateTitle');

    store.refreshState();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('initialization', () => {
    describe('with album route param', () => {
      beforeEach(() => {
        mockParamsSubject.next({ album: 'Album of the Year' });
        component.ngOnInit();
      });

      it('should set viewModel$ based on album title', async () => {
        const vm = await firstValueFrom(component.viewModel$!.pipe(take(1)));

        expect(vm).toStrictEqual({
          album: 'Album of the Year',
          existingAlbums: uniq(MOCK_IMAGES.map(image => image.album)),
          hasUnsavedChanges: false,
          imageEntities: expect.any(Array),
          newImagesFormData: {},
          pageHeading: 'Edit Album of the Year',
          status: 'loaded',
        });
      });

      it('should update title and meta tag accordingly', async () => {
        await firstValueFrom(component.viewModel$!.pipe(take(1)));

        expect(updateTitleSpy).toHaveBeenCalledTimes(1);
        expect(updateDescriptionSpy).toHaveBeenCalledTimes(1);
        expect(updateTitleSpy).toHaveBeenCalledWith('Edit Album of the Year');
        expect(updateDescriptionSpy).toHaveBeenCalledWith(
          'Edit Album of the Year for the London Chess Club.',
        );
      });
    });

    describe('without album route param', () => {
      beforeEach(() => {
        component.ngOnInit();
      });

      it("should default viewModel$ to 'create' mode", async () => {
        const vm = await firstValueFrom(component.viewModel$!.pipe(take(1)));

        expect(vm).toStrictEqual({
          album: null,
          existingAlbums: uniq(MOCK_IMAGES.map(image => image.album)),
          hasUnsavedChanges: false,
          imageEntities: expect.any(Array),
          newImagesFormData: {},
          pageHeading: 'Create an album',
          status: 'loaded',
        });
      });

      it('should update title and meta tag accordingly', async () => {
        await firstValueFrom(component.viewModel$!.pipe(take(1)));

        expect(updateTitleSpy).toHaveBeenCalledTimes(1);
        expect(updateDescriptionSpy).toHaveBeenCalledTimes(1);
        expect(updateTitleSpy).toHaveBeenCalledWith('Create an album');
        expect(updateDescriptionSpy).toHaveBeenCalledWith(
          'Create an album for the London Chess Club.',
        );
      });
    });
  });

  describe('onCancel', () => {
    it('should dispatch cancelSelected action', () => {
      component.onCancel();

      expect(dispatchSpy).toHaveBeenCalledTimes(1);
      expect(dispatchSpy).toHaveBeenCalledWith(ImagesActions.cancelSelected());
    });
  });

  describe('onChange', () => {
    it('should dispatch changeSelected action', () => {
      const mockChangedFormData: Partial<ImageFormData> & { id: string } = {
        id: 'abc123abc123',
        caption: 'A new caption',
        albumOrdinality: '5',
      };
      component.onChange([mockChangedFormData]);

      expect(dispatchSpy).toHaveBeenCalledTimes(1);
      expect(dispatchSpy).toHaveBeenCalledWith(
        ImagesActions.formDataChanged({ multipleFormData: [mockChangedFormData] }),
      );
    });
  });

  describe('onFileActionFail', () => {
    it('should dispatch imageFileActionFailed action', () => {
      const mockError: LccError = {
        name: 'LCCError',
        message: 'Some error message',
      };
      component.onFileActionFail(mockError);

      expect(dispatchSpy).toHaveBeenCalledTimes(1);
      expect(dispatchSpy).toHaveBeenCalledWith(
        ImagesActions.imageFileActionFailed({ error: mockError }),
      );
    });
  });

  describe('onRemoveNewImage', () => {
    it('should dispatch newImageRemoved action', () => {
      const mockImageId = 'abc123abc123';
      component.onRemoveNewImage(mockImageId);

      expect(dispatchSpy).toHaveBeenCalledTimes(1);
      expect(dispatchSpy).toHaveBeenCalledWith(
        ImagesActions.newImageRemoved({ imageId: mockImageId }),
      );
    });
  });

  describe('onRetry', () => {
    it('should fetch the image metadata again', () => {
      component.onRetry();

      expect(dispatchSpy).toHaveBeenCalledTimes(1);
      expect(dispatchSpy).toHaveBeenCalledWith(
        ImagesActions.fetchAllImagesMetadataRequested(),
      );
    });
  });

  describe('onRestore', () => {
    it('should dispatch albumFormDataRestored action', () => {
      const mockAlbum = 'abc123abc123';
      component.onRestore(mockAlbum);

      expect(dispatchSpy).toHaveBeenCalledTimes(1);
      expect(dispatchSpy).toHaveBeenCalledWith(
        ImagesActions.albumFormDataRestored({ album: mockAlbum }),
      );
    });
  });

  describe('template rendering', () => {
    describe('when viewModel$ is undefined', () => {
      it('should not render page components', () => {
        expect(query(fixture.debugElement, 'lcc-page-header')).toBeFalsy();
        expect(query(fixture.debugElement, 'lcc-album-form')).toBeFalsy();
        expect(query(fixture.debugElement, 'lcc-link-list')).toBeFalsy();
      });
    });

    describe('when viewModel$ is defined', () => {
      beforeEach(() => {
        fixture.detectChanges();
      });

      it('should render page components', () => {
        expect(query(fixture.debugElement, 'lcc-page-header')).toBeTruthy();
        expect(query(fixture.debugElement, 'lcc-album-form')).toBeTruthy();
        expect(query(fixture.debugElement, 'lcc-link-list')).toBeTruthy();
      });
    });

    describe('while the album is loading', () => {
      beforeEach(() => {
        store.setState({ imagesState: imagesInitialState });
        mockParamsSubject.next({ album: 'Album of the Year' });
        fixture.detectChanges();
      });

      it('should render a form skeleton in place of the form', () => {
        expect(query(fixture.debugElement, 'lcc-form-skeleton')).toBeTruthy();
        expect(query(fixture.debugElement, 'lcc-page-header')).toBeFalsy();
        expect(query(fixture.debugElement, 'lcc-album-form')).toBeFalsy();
        expect(query(fixture.debugElement, 'lcc-load-failed')).toBeFalsy();
      });
    });

    describe('when the album fails to load', () => {
      beforeEach(() => {
        store.setState({
          imagesState: { ...imagesInitialState, failedLoads: ['metadata'] },
        });
        mockParamsSubject.next({ album: 'Album of the Year' });
        fixture.detectChanges();
      });

      it('should render a failure panel in place of the form', () => {
        expect(query(fixture.debugElement, 'lcc-load-failed')).toBeTruthy();
        expect(query(fixture.debugElement, 'lcc-form-skeleton')).toBeFalsy();
        expect(query(fixture.debugElement, 'lcc-album-form')).toBeFalsy();
        expect(query(fixture.debugElement, 'lcc-link-list')).toBeTruthy();
      });

      it('should fetch the image metadata again on retry', () => {
        query(fixture.debugElement, 'lcc-load-failed').triggerEventHandler('retry');

        expect(dispatchSpy).toHaveBeenCalledWith(
          ImagesActions.fetchAllImagesMetadataRequested(),
        );
      });
    });
  });
});
