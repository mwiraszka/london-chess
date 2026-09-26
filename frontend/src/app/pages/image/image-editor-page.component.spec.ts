import { provideMockActions } from '@ngrx/effects/testing';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { pick, uniq } from 'lodash';
import { BehaviorSubject, EMPTY, Observable, Subject, firstValueFrom, take } from 'rxjs';

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

import { ImageEditorPageComponent } from './image-editor-page.component';

describe('ImageEditorPageComponent', () => {
  let fixture: ComponentFixture<ImageEditorPageComponent>;
  let component: ImageEditorPageComponent;

  let metaAndTitleService: MetaAndTitleService;
  let mockParamsSubject: BehaviorSubject<{ image_id?: string }>;
  let activatedRoute: { params: Observable<{ image_id?: string }> };
  let store: MockStore;

  let dispatchSpy: MockInstance;
  let updateDescriptionSpy: MockInstance;
  let updateTitleSpy: MockInstance;

  beforeEach(async () => {
    mockParamsSubject = new BehaviorSubject<{ image_id?: string }>({});
    activatedRoute = { params: mockParamsSubject.asObservable() };

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
      totalCount: MOCK_IMAGES.length,
    };

    await TestBed.configureTestingModule({
      imports: [ImageEditorPageComponent],
      providers: [
        provideMockActions(() => EMPTY),
        {
          provide: ActivatedRoute,
          useValue: activatedRoute,
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

    fixture = TestBed.createComponent(ImageEditorPageComponent);
    component = fixture.componentInstance;

    metaAndTitleService = TestBed.inject(MetaAndTitleService);
    store = TestBed.inject(MockStore);

    dispatchSpy = vi.spyOn(store, 'dispatch');
    updateDescriptionSpy = vi.spyOn(metaAndTitleService, 'updateDescription');
    updateTitleSpy = vi.spyOn(metaAndTitleService, 'updateTitle');

    store.refreshState();
  });

  describe('initialization', () => {
    describe('with image route param', () => {
      beforeEach(() => {
        mockParamsSubject.next({ image_id: MOCK_IMAGES[0].id });
        component.ngOnInit();
      });

      it('should set viewModel$ based on image filename', async () => {
        const vm = await firstValueFrom(component.viewModel$!.pipe(take(1)));

        expect(vm).toStrictEqual({
          existingAlbums: uniq(MOCK_IMAGES.map(image => image.album)),
          hasUnsavedChanges: false,
          imageEntity: {
            image: MOCK_IMAGES[0],
            formData: pick(MOCK_IMAGES[0], IMAGE_FORM_DATA_PROPERTIES),
          },
          imageId: MOCK_IMAGES[0].id,
          newImageFormData: null,
          pageHeading: `Edit ${MOCK_IMAGES[0].filename}`,
          status: 'loaded',
        });
      });

      it('should update title and meta tag accordingly', async () => {
        await firstValueFrom(component.viewModel$!.pipe(take(1)));

        expect(updateTitleSpy).toHaveBeenCalledTimes(1);
        expect(updateDescriptionSpy).toHaveBeenCalledTimes(1);
        expect(updateTitleSpy).toHaveBeenCalledWith(`Edit ${MOCK_IMAGES[0].filename}`);
        expect(updateDescriptionSpy).toHaveBeenCalledWith(
          `Edit ${MOCK_IMAGES[0].filename} for the London Chess Club.`,
        );
      });
    });

    describe('without image route param', () => {
      beforeEach(() => {
        component.ngOnInit();
      });

      it("should default viewModel$ to 'create' mode", async () => {
        const vm = await firstValueFrom(component.viewModel$!.pipe(take(1)));

        expect(vm).toStrictEqual({
          existingAlbums: uniq(MOCK_IMAGES.map(image => image.album)),
          hasUnsavedChanges: false,
          imageEntity: null,
          imageId: null,
          newImageFormData: null,
          pageHeading: 'Add an image',
          status: 'loaded',
        });
      });

      it('should update title and meta tag accordingly', async () => {
        await firstValueFrom(component.viewModel$!.pipe(take(1)));

        expect(updateTitleSpy).toHaveBeenCalledTimes(1);
        expect(updateDescriptionSpy).toHaveBeenCalledTimes(1);
        expect(updateTitleSpy).toHaveBeenCalledWith('Add an image');
        expect(updateDescriptionSpy).toHaveBeenCalledWith(
          'Add an image for the London Chess Club.',
        );
      });
    });
  });

  describe('form events', () => {
    const imageForm = () => query(fixture.debugElement, 'lcc-image-form');

    beforeEach(() => {
      fixture.detectChanges();
      dispatchSpy.mockClear();
    });

    it('should cancel editing', () => {
      imageForm().triggerEventHandler('cancel');

      expect(dispatchSpy).toHaveBeenCalledExactlyOnceWith(ImagesActions.cancelSelected());
    });

    it('should store changed form data', () => {
      const multipleFormData: Array<Partial<ImageFormData> & { id: string }> = [
        { id: 'abc123abc123', caption: 'A new caption' },
      ];

      imageForm().triggerEventHandler('change', { multipleFormData });

      expect(dispatchSpy).toHaveBeenCalledExactlyOnceWith(
        ImagesActions.formDataChanged({ multipleFormData }),
      );
    });

    it('should report a failed file action', () => {
      const error: LccError = { name: 'LCCError', message: 'Some error message' };

      imageForm().triggerEventHandler('fileActionFail', error);

      expect(dispatchSpy).toHaveBeenCalledExactlyOnceWith(
        ImagesActions.imageFileActionFailed({ error }),
      );
    });

    it('should fetch a main image the form asks for', () => {
      imageForm().triggerEventHandler('requestFetchMainImage', 'abc123abc123');

      expect(dispatchSpy).toHaveBeenCalledExactlyOnceWith(
        ImagesActions.fetchMainImageRequested({ imageId: 'abc123abc123' }),
      );
    });

    it('should restore the saved image', () => {
      imageForm().triggerEventHandler('restore', 'abc123abc123');

      expect(dispatchSpy).toHaveBeenCalledExactlyOnceWith(
        ImagesActions.imageFormDataRestored({ imageId: 'abc123abc123' }),
      );
    });
  });

  describe('onRetry', () => {
    it('should not fetch anything for a new image', () => {
      component.onRetry(null);

      expect(dispatchSpy).not.toHaveBeenCalled();
    });
  });

  describe('template rendering', () => {
    it('should render nothing until the route params arrive', () => {
      const params = new Subject<{ image_id?: string }>();
      activatedRoute.params = params;

      fixture.detectChanges();

      expect(query(fixture.debugElement, 'lcc-link-list')).toBeFalsy();

      params.next({});
      fixture.detectChanges();

      expect(query(fixture.debugElement, 'lcc-image-form')).toBeTruthy();
    });

    describe('when viewModel$ is defined', () => {
      beforeEach(() => {
        fixture.detectChanges();
      });

      it('should render page components', () => {
        expect(query(fixture.debugElement, 'lcc-page-header')).toBeTruthy();
        expect(query(fixture.debugElement, 'lcc-image-form')).toBeTruthy();
        expect(query(fixture.debugElement, 'lcc-link-list')).toBeTruthy();
      });
    });

    describe('while the image is loading', () => {
      beforeEach(() => {
        mockParamsSubject.next({ image_id: 'unknown-id' });
        fixture.detectChanges();
      });

      it('should render a form skeleton in place of the form', () => {
        expect(query(fixture.debugElement, 'lcc-form-skeleton')).toBeTruthy();
        expect(query(fixture.debugElement, 'lcc-page-header')).toBeFalsy();
        expect(query(fixture.debugElement, 'lcc-image-form')).toBeFalsy();
        expect(query(fixture.debugElement, 'lcc-load-failed')).toBeFalsy();
      });
    });

    describe('when the image fails to load', () => {
      beforeEach(() => {
        store.setState({
          imagesState: { ...imagesInitialState, failedLoads: ['mainImage'] },
        });
        mockParamsSubject.next({ image_id: 'unknown-id' });
        fixture.detectChanges();
      });

      it('should render a failure panel in place of the form', () => {
        expect(query(fixture.debugElement, 'lcc-load-failed')).toBeTruthy();
        expect(query(fixture.debugElement, 'lcc-form-skeleton')).toBeFalsy();
        expect(query(fixture.debugElement, 'lcc-image-form')).toBeFalsy();
        expect(query(fixture.debugElement, 'lcc-link-list')).toBeTruthy();
      });

      it('should fetch the image again on retry', () => {
        query(fixture.debugElement, 'lcc-load-failed').triggerEventHandler('retry');

        expect(dispatchSpy).toHaveBeenCalledWith(
          ImagesActions.fetchMainImageRequested({ imageId: 'unknown-id' }),
        );
      });
    });
  });
});
