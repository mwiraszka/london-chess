import { provideMockActions } from '@ngrx/effects/testing';
import { Action } from '@ngrx/store';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import moment from 'moment-timezone';
import { Observable, ReplaySubject, firstValueFrom, of, throwError } from 'rxjs';
import { filter, take, toArray } from 'rxjs/operators';

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { INITIAL_IMAGE_FORM_DATA } from '@app/constants';
import { MOCK_ARTICLES } from '@app/mocks/articles.mock';
import { MOCK_IMAGES } from '@app/mocks/images.mock';
import {
  ApiResponse,
  Article,
  BaseImage,
  Id,
  Image,
  LccError,
  PaginatedItems,
  User,
} from '@app/models';
import { ImageFileService, ImagesApiService, UserService } from '@app/services';
import { ArticlesActions, ArticlesSelectors } from '@app/store/articles';
import { initialState as articlesInitialState } from '@app/store/articles/articles.reducer';
import { AuthSelectors } from '@app/store/auth';
import { NavSelectors } from '@app/store/nav';
import {
  BUILD_IMAGES_FORM_DATA,
  DATA_URL_TO_FILE,
  IS_EXPIRED,
  IS_LCC_ERROR,
  PARSE_ERROR,
} from '@app/tokens';

import { ImagesActions, ImagesSelectors } from '.';
import { ImagesEffects } from './images.effects';

const mockBuildImagesFormData = vi.fn();
const mockParseError = vi.fn();
const mockIsExpired = vi.fn();
const mockDataUrlToFile = vi.fn();
const mockIsLccError = vi.fn();

const isOutcome = (action: Action) =>
  action.type !== ImagesActions.imageUploadsProgressed.type;

describe('ImagesEffects', () => {
  let actions$: ReplaySubject<Action>;
  let effects: ImagesEffects;
  let imagesApiService: Mocked<ImagesApiService>;
  let store: MockStore;

  const mockUser: User = {
    id: 'user123',
    firstName: 'Test',
    lastName: 'User',
    email: 'test@example.com',
    isAdmin: true,
  };

  const mockError: LccError = {
    name: 'LCCError',
    message: 'Test error',
  };

  const mockApiResponse: ApiResponse<PaginatedItems<Image>> = {
    data: {
      items: [MOCK_IMAGES[0], MOCK_IMAGES[1]],
      filteredCount: 2,
      totalCount: 10,
    },
  };

  const mockImageMetadataResponse: ApiResponse<BaseImage[]> = {
    data: MOCK_IMAGES.map(img => ({
      id: img.id,
      filename: img.filename,
      caption: img.caption,
      album: img.album,
      albumCover: img.albumCover,
      albumOrdinality: img.albumOrdinality,
      modificationInfo: img.modificationInfo,
    })),
  };

  const mockImagesState = {
    ids: MOCK_IMAGES.map(i => i.id),
    entities: MOCK_IMAGES.reduce(
      (acc, image) => ({
        ...acc,
        [image.id]: { image, formData: { ...INITIAL_IMAGE_FORM_DATA, id: image.id } },
      }),
      {},
    ),
    failedLoads: [],
    isFetchingFiltered: false,
    uploadProgress: null,
    newImageFormData: null,
    newImagesFormData: {},
    lastMetadataFetch: null,
    lastFilteredThumbnailsFetch: null,
    lastAlbumCoversFetch: null,
    options: {
      page: 1,
      pageSize: 12,
      sortBy: 'filename',
      sortOrder: 'asc',
      filters: null,
      search: '',
    },
    filteredCount: null,
    totalCount: 0,
  };

  beforeEach(() => {
    const imagesApiServiceMock = {
      getAllImagesMetadata: vi.fn(),
      getFilteredThumbnailImages: vi.fn(),
      getBatchThumbnailImages: vi.fn(),
      getMainImage: vi.fn(),
      addImages: vi.fn(),
      updateImages: vi.fn(),
      deleteImage: vi.fn(),
      deleteAlbum: vi.fn(),
    };

    const imageFileServiceMock = {
      getImage: vi.fn(),
      getAllImages: vi.fn(),
      deleteImage: vi.fn(),
      clearAllImages: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        ImagesEffects,
        { provide: BUILD_IMAGES_FORM_DATA, useValue: mockBuildImagesFormData },
        { provide: DATA_URL_TO_FILE, useValue: mockDataUrlToFile },
        { provide: IS_EXPIRED, useValue: mockIsExpired },
        { provide: IS_LCC_ERROR, useValue: mockIsLccError },
        { provide: PARSE_ERROR, useValue: mockParseError },
        provideMockActions(() => actions$),
        { provide: ImagesApiService, useValue: imagesApiServiceMock },
        { provide: ImageFileService, useValue: imageFileServiceMock },
        { provide: UserService, useValue: { memberNumber: signal(null) } },
        provideMockStore({
          initialState: {
            imagesState: mockImagesState,
          },
        }),
      ],
    });

    effects = TestBed.inject(ImagesEffects);
    imagesApiService = TestBed.inject(ImagesApiService) as Mocked<ImagesApiService>;
    store = TestBed.inject(MockStore);
    actions$ = new ReplaySubject<Action>(1);

    vi.clearAllMocks();
    mockParseError.mockImplementation(error => error);
    mockIsLccError.mockReturnValue(false);
    mockBuildImagesFormData.mockReturnValue(new FormData());
  });

  afterEach(() => {
    store.resetSelectors();
    vi.useRealTimers();
  });

  describe('fetchAllImagesMetadata$', () => {
    it('should fetch all images metadata successfully', () =>
      withDone(done => {
        imagesApiService.getAllImagesMetadata.mockReturnValue(
          of(mockImageMetadataResponse),
        );

        actions$.next(ImagesActions.fetchAllImagesMetadataRequested());

        effects.fetchAllImagesMetadata$.subscribe(action => {
          expect(action).toEqual(
            ImagesActions.fetchAllImagesMetadataSucceeded({
              images: mockImageMetadataResponse.data,
            }),
          );
          expect(imagesApiService.getAllImagesMetadata).toHaveBeenCalledTimes(1);
          done();
        });
      }));

    it('should handle fetch all images metadata failure', () =>
      withDone(done => {
        imagesApiService.getAllImagesMetadata.mockReturnValue(
          throwError(() => mockError),
        );
        mockParseError.mockReturnValue(mockError);

        actions$.next(ImagesActions.fetchAllImagesMetadataRequested());

        effects.fetchAllImagesMetadata$.subscribe(action => {
          expect(action).toEqual(
            ImagesActions.fetchAllImagesMetadataFailed({ error: mockError }),
          );
          expect(mockParseError).toHaveBeenCalledWith(mockError);
          done();
        });
      }));
  });

  describe('fetchFilteredThumbnailImages$', () => {
    const mockOptions = {
      page: 1,
      pageSize: 12,
      sortBy: 'filename' as const,
      sortOrder: 'asc' as const,
      filters: null,
      search: 'chess',
    };

    beforeEach(() => {
      store.overrideSelector(ImagesSelectors.selectOptions, mockOptions);
      store.refreshState();
    });

    it('should fetch filtered thumbnail images with options from store', () =>
      withDone(done => {
        imagesApiService.getFilteredThumbnailImages.mockReturnValue(of(mockApiResponse));

        actions$.next(ImagesActions.fetchFilteredThumbnailsRequested());

        effects.fetchFilteredThumbnailImages$.subscribe(action => {
          expect(action).toEqual(
            ImagesActions.fetchFilteredThumbnailsSucceeded({
              images: mockApiResponse.data.items,
              filteredCount: mockApiResponse.data.filteredCount,
              totalCount: mockApiResponse.data.totalCount,
            }),
          );
          expect(imagesApiService.getFilteredThumbnailImages).toHaveBeenCalledWith(
            mockOptions,
          );
          done();
        });
      }));

    it('should handle fetch filtered thumbnail images failure', () =>
      withDone(done => {
        imagesApiService.getFilteredThumbnailImages.mockReturnValue(
          throwError(() => mockError),
        );
        mockParseError.mockReturnValue(mockError);

        actions$.next(ImagesActions.fetchFilteredThumbnailsRequested());

        effects.fetchFilteredThumbnailImages$.subscribe(action => {
          expect(action).toEqual(
            ImagesActions.fetchFilteredThumbnailsFailed({ error: mockError }),
          );
          done();
        });
      }));
  });

  describe('fetchBatchThumbnailImages$', () => {
    it('should fetch batch thumbnail images successfully', () =>
      withDone(done => {
        const imageIds = [MOCK_IMAGES[0].id, MOCK_IMAGES[1].id];
        const mockBatchResponse: ApiResponse<Image[]> = {
          data: [MOCK_IMAGES[0], MOCK_IMAGES[1]],
        };
        imagesApiService.getBatchThumbnailImages.mockReturnValue(of(mockBatchResponse));

        actions$.next(
          ImagesActions.fetchBatchThumbnailsRequested({
            imageIds,
            context: 'album-covers',
          }),
        );

        effects.fetchBatchThumbnailImages$.subscribe(action => {
          expect(action).toEqual(
            ImagesActions.fetchBatchThumbnailsSucceeded({
              images: mockBatchResponse.data,
              context: 'album-covers',
            }),
          );
          expect(imagesApiService.getBatchThumbnailImages).toHaveBeenCalledWith(imageIds);
          done();
        });
      }));

    it('should handle fetch batch thumbnail images failure', () =>
      withDone(done => {
        const imageIds = [MOCK_IMAGES[0].id];
        imagesApiService.getBatchThumbnailImages.mockReturnValue(
          throwError(() => mockError),
        );
        mockParseError.mockReturnValue(mockError);

        actions$.next(
          ImagesActions.fetchBatchThumbnailsRequested({
            imageIds,
            context: 'album-covers',
          }),
        );

        effects.fetchBatchThumbnailImages$.subscribe(action => {
          expect(action).toEqual(
            ImagesActions.fetchBatchThumbnailsFailed({ error: mockError }),
          );
          done();
        });
      }));
  });

  describe('fetchMainImage$', () => {
    it('should fetch main image successfully', () =>
      withDone(done => {
        const mockMainImageResponse: ApiResponse<Image> = { data: MOCK_IMAGES[0] };
        imagesApiService.getMainImage.mockReturnValue(of(mockMainImageResponse));

        actions$.next(
          ImagesActions.fetchMainImageRequested({ imageId: MOCK_IMAGES[0].id }),
        );

        effects.fetchMainImage$.subscribe(action => {
          expect(action).toEqual(
            ImagesActions.fetchMainImageSucceeded({ image: MOCK_IMAGES[0] }),
          );
          expect(imagesApiService.getMainImage).toHaveBeenCalledWith(MOCK_IMAGES[0].id);
          done();
        });
      }));

    it('should handle fetch main image failure', () =>
      withDone(done => {
        imagesApiService.getMainImage.mockReturnValue(throwError(() => mockError));
        mockParseError.mockReturnValue(mockError);

        actions$.next(ImagesActions.fetchMainImageRequested({ imageId: 'invalid-id' }));

        effects.fetchMainImage$.subscribe(action => {
          expect(action).toEqual(
            ImagesActions.fetchMainImageFailed({ error: mockError }),
          );
          done();
        });
      }));
  });

  describe('fetchMainImage$ (background requests)', () => {
    it('should fetch main image for a background request', () =>
      withDone(done => {
        const mockMainImageResponse: ApiResponse<Image> = { data: MOCK_IMAGES[0] };
        imagesApiService.getMainImage.mockReturnValue(of(mockMainImageResponse));

        actions$.next(
          ImagesActions.fetchMainImageInBackgroundRequested({
            imageId: MOCK_IMAGES[0].id,
          }),
        );

        effects.fetchMainImage$.subscribe(action => {
          expect(action).toEqual(
            ImagesActions.fetchMainImageSucceeded({ image: MOCK_IMAGES[0] }),
          );
          expect(imagesApiService.getMainImage).toHaveBeenCalledWith(MOCK_IMAGES[0].id);
          done();
        });
      }));

    it('should dispatch the silent background failure action on error', () =>
      withDone(done => {
        imagesApiService.getMainImage.mockReturnValue(throwError(() => mockError));
        mockParseError.mockReturnValue(mockError);

        actions$.next(
          ImagesActions.fetchMainImageInBackgroundRequested({ imageId: 'invalid-id' }),
        );

        effects.fetchMainImage$.subscribe(action => {
          expect(action).toEqual(
            ImagesActions.fetchMainImageInBackgroundFailed({ error: mockError }),
          );
          done();
        });
      }));
  });

  describe('refetchMetadata$', () => {
    it('should trigger refetch after addImageSucceeded', () =>
      withDone(done => {
        const baseImage: BaseImage = {
          id: 'new-id',
          filename: 'test.jpg',
          caption: 'Test',
          album: 'Test Album',
          albumCover: false,
          albumOrdinality: '1',
          modificationInfo: MOCK_IMAGES[0].modificationInfo,
        };
        actions$.next(ImagesActions.addImageSucceeded({ image: baseImage }));

        effects.refetchMetadata$.subscribe(action => {
          expect(action).toEqual(ImagesActions.fetchAllImagesMetadataRequested());
          done();
        });
      }));

    it('should trigger refetch after updateImageSucceeded', () =>
      withDone(done => {
        const baseImage: BaseImage = {
          id: MOCK_IMAGES[0].id,
          filename: MOCK_IMAGES[0].filename,
          caption: 'Updated',
          album: MOCK_IMAGES[0].album,
          albumCover: false,
          albumOrdinality: '1',
          modificationInfo: MOCK_IMAGES[0].modificationInfo,
        };
        actions$.next(ImagesActions.updateImageSucceeded({ baseImage }));

        effects.refetchMetadata$.subscribe(action => {
          expect(action).toEqual(ImagesActions.fetchAllImagesMetadataRequested());
          done();
        });
      }));

    it('should trigger refetch after deleteImageSucceeded', () =>
      withDone(done => {
        actions$.next(ImagesActions.deleteImageSucceeded({ image: MOCK_IMAGES[0] }));

        effects.refetchMetadata$.subscribe(action => {
          expect(action).toEqual(ImagesActions.fetchAllImagesMetadataRequested());
          done();
        });
      }));

    it('should trigger refetch when last fetch is expired', () => {
      vi.useFakeTimers();
      const expiredTimestamp = moment().subtract(10, 'minutes').toISOString();
      store.overrideSelector(ImagesSelectors.selectLastMetadataFetch, expiredTimestamp);
      store.refreshState();
      mockIsExpired.mockReturnValue(true);

      const results: Action[] = [];
      effects.refetchMetadata$.subscribe(action => {
        results.push(action);
      });

      vi.advanceTimersByTime(3000);
      vi.advanceTimersByTime(5 * 60 * 1000);

      expect(results[0]).toEqual(ImagesActions.fetchAllImagesMetadataRequested());
      expect(mockIsExpired).toHaveBeenCalledWith(expiredTimestamp);
    });

    it('should not trigger refetch when last fetch is not expired', () => {
      vi.useFakeTimers();
      const recentTimestamp = moment().subtract(2, 'minutes').toISOString();
      store.overrideSelector(ImagesSelectors.selectLastMetadataFetch, recentTimestamp);
      store.refreshState();
      mockIsExpired.mockReturnValue(false);

      const results: Action[] = [];
      effects.refetchMetadata$.subscribe(action => {
        results.push(action);
      });

      vi.advanceTimersByTime(3000);
      vi.advanceTimersByTime(5 * 60 * 1000);

      expect(results).toHaveLength(0);
    });
  });

  describe('updateImage$', () => {
    beforeEach(() => {
      store.overrideSelector(AuthSelectors.selectUser, mockUser);
      store.refreshState();
    });

    it('should update image successfully', () =>
      withDone(done => {
        const imageId = MOCK_IMAGES[0].id;
        const mockUpdateResponse: ApiResponse<{
          newImages: Image[];
          updatedImages: BaseImage[];
        }> = {
          data: {
            newImages: [],
            updatedImages: [
              {
                id: MOCK_IMAGES[0].id,
                filename: MOCK_IMAGES[0].filename,
                caption: MOCK_IMAGES[0].caption,
                album: MOCK_IMAGES[0].album,
                albumCover: MOCK_IMAGES[0].albumCover,
                albumOrdinality: MOCK_IMAGES[0].albumOrdinality,
                modificationInfo: MOCK_IMAGES[0].modificationInfo,
              },
            ],
          },
        };

        imagesApiService.updateImages.mockReturnValue(of(mockUpdateResponse));

        actions$.next(ImagesActions.updateImageRequested({ imageId }));

        effects.updateImage$.subscribe(action => {
          expect(action.type).toBe(ImagesActions.updateImageSucceeded.type);
          const payload = action as ReturnType<typeof ImagesActions.updateImageSucceeded>;
          expect(payload.baseImage.id).toBe(imageId);
          expect(payload.baseImage.modificationInfo.lastEditedBy).toBe('Test User');
          expect(imagesApiService.updateImages).toHaveBeenCalled();
          done();
        });
      }));

    it('should handle update image failure', () =>
      withDone(done => {
        const imageId = MOCK_IMAGES[0].id;

        imagesApiService.updateImages.mockReturnValue(throwError(() => mockError));
        mockParseError.mockReturnValue(mockError);

        actions$.next(ImagesActions.updateImageRequested({ imageId }));

        effects.updateImage$.subscribe(action => {
          expect(action.type).toBe(ImagesActions.updateImageFailed.type);
          done();
        });
      }));

    it('should fail when response counts do not match expected values', () =>
      withDone(done => {
        const imageId = MOCK_IMAGES[0].id;
        const mockUpdateResponse: ApiResponse<{
          newImages: Image[];
          updatedImages: BaseImage[];
        }> = {
          data: {
            newImages: [MOCK_IMAGES[0]], // Expected 0
            updatedImages: [],
          },
        };

        imagesApiService.updateImages.mockReturnValue(of(mockUpdateResponse));

        actions$.next(ImagesActions.updateImageRequested({ imageId }));

        effects.updateImage$.subscribe(action => {
          expect(action.type).toBe(ImagesActions.updateImageFailed.type);
          const payload = action as ReturnType<typeof ImagesActions.updateImageFailed>;
          expect(payload.error.message).toContain(
            'Expected 0 images to be added and 1 image to be updated',
          );
          done();
        });
      }));

    it('should build FormData with existing image', () =>
      withDone(done => {
        const imageId = MOCK_IMAGES[0].id;
        const mockUpdateResponse: ApiResponse<{
          newImages: Image[];
          updatedImages: BaseImage[];
        }> = {
          data: {
            newImages: [],
            updatedImages: [
              {
                id: MOCK_IMAGES[0].id,
                filename: MOCK_IMAGES[0].filename,
                caption: MOCK_IMAGES[0].caption,
                album: MOCK_IMAGES[0].album,
                albumCover: MOCK_IMAGES[0].albumCover,
                albumOrdinality: MOCK_IMAGES[0].albumOrdinality,
                modificationInfo: MOCK_IMAGES[0].modificationInfo,
              },
            ],
          },
        };

        imagesApiService.updateImages.mockReturnValue(of(mockUpdateResponse));

        actions$.next(ImagesActions.updateImageRequested({ imageId }));

        effects.updateImage$.subscribe(action => {
          expect(action.type).toBe(ImagesActions.updateImageSucceeded.type);
          const callArg = imagesApiService.updateImages.mock.calls[0][0];
          expect(callArg).toBeInstanceOf(FormData);
          done();
        });
      }));
  });

  describe('addImages$', () => {
    const album = 'New Album';
    const mockIndexedDbData = [
      { id: 'new-1', filename: 'new1.jpg', dataUrl: 'data:image/jpeg;base64,abc' },
      { id: 'new-2', filename: 'new2.jpg', dataUrl: 'data:image/jpeg;base64,def' },
    ];
    let mockImageFileService: Mocked<ImageFileService>;

    beforeEach(() => {
      mockImageFileService = TestBed.inject(ImageFileService) as Mocked<ImageFileService>;
      store.overrideSelector(AuthSelectors.selectUser, mockUser);
      store.overrideSelector(ImagesSelectors.selectNewImagesFormData, {
        'new-1': { ...INITIAL_IMAGE_FORM_DATA, id: 'new-1', album },
        'new-2': { ...INITIAL_IMAGE_FORM_DATA, id: 'new-2', album },
      });
      store.refreshState();
      mockImageFileService.getAllImages.mockReturnValue(
        Promise.resolve(mockIndexedDbData),
      );
      mockImageFileService.deleteImage.mockReturnValue(Promise.resolve('success'));
    });

    it('should report progress before adding the uploaded images', async () => {
      const uploadedImages = [
        { ...MOCK_IMAGES[0], id: 'new-1' },
        { ...MOCK_IMAGES[1], id: 'new-2' },
      ];
      imagesApiService.addImages.mockReturnValueOnce(of({ data: [uploadedImages[0]] }));
      imagesApiService.addImages.mockReturnValueOnce(of({ data: [uploadedImages[1]] }));

      actions$.next(ImagesActions.addImagesRequested());
      const emitted = await firstValueFrom(effects.addImages$.pipe(take(4), toArray()));

      expect(emitted).toEqual([
        ImagesActions.imageUploadsProgressed({ uploaded: 0, total: 2 }),
        ImagesActions.imageUploadsProgressed({ uploaded: 1, total: 2 }),
        ImagesActions.imageUploadsProgressed({ uploaded: 2, total: 2 }),
        ImagesActions.addImagesSucceeded({ images: uploadedImages }),
      ]);
    });

    it('should count failed uploads towards the progress', async () => {
      imagesApiService.addImages.mockReturnValue(throwError(() => mockError));

      actions$.next(ImagesActions.addImagesRequested());
      const emitted = await firstValueFrom(effects.addImages$.pipe(take(4), toArray()));

      expect(emitted[2]).toEqual(
        ImagesActions.imageUploadsProgressed({ uploaded: 2, total: 2 }),
      );
      expect(emitted[3]).toEqual(
        ImagesActions.addImagesFailed({
          error: { name: 'LCCError', message: '2 of 2 images failed to upload' },
        }),
      );
    });

    it('should report uploads that fail before sending a request', async () => {
      mockIsLccError.mockImplementation(value => value === mockError);
      mockBuildImagesFormData.mockReturnValue(mockError);

      actions$.next(ImagesActions.addImagesRequested());
      const emitted = await firstValueFrom(effects.addImages$.pipe(take(4), toArray()));

      expect(emitted.map(action => action.type)).toEqual([
        ImagesActions.imageUploadsProgressed.type,
        ImagesActions.imageUploadsProgressed.type,
        ImagesActions.imageUploadsProgressed.type,
        ImagesActions.addImagesFailed.type,
      ]);
      expect(imagesApiService.addImages).not.toHaveBeenCalled();
    });

    it('should fail without uploading when no image files are stored', async () => {
      mockImageFileService.getAllImages.mockReturnValue(Promise.resolve([]));

      actions$.next(ImagesActions.addImagesRequested());
      const action = await firstValueFrom(effects.addImages$);

      expect(action).toEqual(
        ImagesActions.addImagesFailed({
          error: { name: 'LCCError', message: 'No image data found in IndexedDB' },
        }),
      );
    });
  });

  describe('refetchFilteredThumbnails$', () => {
    const options = {
      page: 2,
      pageSize: 12,
      sortBy: 'filename' as const,
      sortOrder: 'asc' as const,
      filters: null,
      search: '',
    };

    beforeEach(() => {
      vi.useFakeTimers();
      mockIsExpired.mockReturnValue(false);
    });

    it('should refetch when the options change and ask for a fetch', () => {
      const results: Action[] = [];
      effects.refetchFilteredThumbnails$.subscribe(action => results.push(action));

      actions$.next(ImagesActions.paginationOptionsChanged({ options, fetch: true }));
      vi.advanceTimersByTime(0);

      expect(results).toEqual([ImagesActions.fetchFilteredThumbnailsRequested()]);
    });

    it('should not refetch when the options change without asking for a fetch', () => {
      const results: Action[] = [];
      effects.refetchFilteredThumbnails$.subscribe(action => results.push(action));

      actions$.next(ImagesActions.paginationOptionsChanged({ options, fetch: false }));
      vi.advanceTimersByTime(0);

      expect(results).toHaveLength(0);
    });
  });

  describe('refetchAlbumCoverThumbnails$', () => {
    const coverWithoutThumbnail: Image = {
      ...MOCK_IMAGES[0],
      albumCover: true,
      thumbnailUrl: undefined,
    };

    function seedImagesState(
      images: Image[],
      lastMetadataFetch: string | null,
      lastAlbumCoversFetch: string | null = null,
    ): void {
      store.setState({
        imagesState: {
          ...mockImagesState,
          ids: images.map(image => image.id),
          entities: Object.fromEntries(
            images.map(image => [
              image.id,
              { image, formData: { ...INITIAL_IMAGE_FORM_DATA, id: image.id } },
            ]),
          ),
          lastMetadataFetch,
          lastAlbumCoversFetch,
        },
      });
    }

    it('should fetch missing album cover thumbnails after every metadata refresh', async () => {
      seedImagesState([coverWithoutThumbnail], null);
      mockIsExpired.mockReturnValue(false);

      actions$.next(
        ImagesActions.fetchAllImagesMetadataSucceeded({
          images: mockImageMetadataResponse.data,
        }),
      );
      const action = await firstValueFrom(effects.refetchAlbumCoverThumbnails$);

      expect(action).toEqual(
        ImagesActions.fetchBatchThumbnailsRequested({
          imageIds: [coverWithoutThumbnail.id],
          context: 'album-covers',
        }),
      );
    });

    it('should check for expired album covers as soon as it starts', () => {
      vi.useFakeTimers();
      const lastMetadataFetch = moment().toISOString();
      seedImagesState([coverWithoutThumbnail], lastMetadataFetch);
      mockIsExpired.mockImplementation(lastFetch => lastFetch !== lastMetadataFetch);
      const results: Action[] = [];

      effects.refetchAlbumCoverThumbnails$.subscribe(action => results.push(action));
      vi.advanceTimersByTime(0);

      expect(results).toEqual([
        ImagesActions.fetchBatchThumbnailsRequested({
          imageIds: [coverWithoutThumbnail.id],
          context: 'album-covers',
        }),
      ]);
    });

    it('should wait for fresh metadata before checking the album covers', () => {
      vi.useFakeTimers();
      seedImagesState([coverWithoutThumbnail], null);
      mockIsExpired.mockReturnValue(true);
      const results: Action[] = [];

      effects.refetchAlbumCoverThumbnails$.subscribe(action => results.push(action));
      vi.advanceTimersByTime(5 * 60 * 1000);

      expect(results).toHaveLength(0);
    });

    it('should not fetch anything when no album cover needs a thumbnail', async () => {
      seedImagesState([{ ...MOCK_IMAGES[0], albumCover: false }], null);
      mockIsExpired.mockReturnValue(false);
      const results: Action[] = [];

      effects.refetchAlbumCoverThumbnails$.subscribe(action => results.push(action));
      actions$.next(
        ImagesActions.fetchAllImagesMetadataSucceeded({
          images: mockImageMetadataResponse.data,
        }),
      );
      await Promise.resolve();

      expect(results).toHaveLength(0);
    });
  });

  describe('updateAlbum$', () => {
    const album = 'Test Album';
    const mockIndexedDbData = [
      { id: 'new-1', filename: 'new1.jpg', dataUrl: 'data:image/jpeg;base64,abc' },
      { id: 'new-2', filename: 'new2.jpg', dataUrl: 'data:image/jpeg;base64,def' },
    ];
    // Real factory selector selectImageEntitiesByAlbum(album) filters the seeded
    // images state by album, so place one existing image in the target album.
    const existingAlbumImage: Image = { ...MOCK_IMAGES[0], album };
    let mockImageFileService: Mocked<ImageFileService>;

    const seedImagesStateWithAlbumImage = () => {
      store.setState({
        imagesState: {
          ...mockImagesState,
          ids: [existingAlbumImage.id],
          entities: {
            [existingAlbumImage.id]: {
              image: existingAlbumImage,
              formData: {
                id: existingAlbumImage.id,
                filename: existingAlbumImage.filename,
                caption: existingAlbumImage.caption,
                album: existingAlbumImage.album,
                albumCover: existingAlbumImage.albumCover,
                albumOrdinality: existingAlbumImage.albumOrdinality,
              },
            },
          },
        },
      });
    };

    beforeEach(() => {
      mockImageFileService = TestBed.inject(ImageFileService) as Mocked<ImageFileService>;
      store.overrideSelector(AuthSelectors.selectUser, mockUser);
      store.overrideSelector(ImagesSelectors.selectNewImagesFormData, {
        'new-1': { ...INITIAL_IMAGE_FORM_DATA, id: 'new-1', album },
        'new-2': { ...INITIAL_IMAGE_FORM_DATA, id: 'new-2', album },
      });
      seedImagesStateWithAlbumImage();
      store.refreshState();
      mockIsLccError.mockReturnValue(false);
      mockDataUrlToFile.mockReturnValue(new File([''], 'test.jpg'));
      mockImageFileService.deleteImage.mockReturnValue(Promise.resolve('success'));
    });

    it('should update album with new and existing images successfully', () =>
      withDone(done => {
        const newImages = [
          { ...MOCK_IMAGES[0], id: 'new-1', filename: 'new1.jpg' },
          { ...MOCK_IMAGES[1], id: 'new-2', filename: 'new2.jpg' },
        ];
        const updatedImages: BaseImage[] = [
          {
            id: existingAlbumImage.id,
            filename: existingAlbumImage.filename,
            caption: existingAlbumImage.caption,
            album: existingAlbumImage.album,
            albumCover: existingAlbumImage.albumCover,
            albumOrdinality: existingAlbumImage.albumOrdinality,
            modificationInfo: existingAlbumImage.modificationInfo,
          },
        ];

        mockImageFileService.getAllImages.mockReturnValue(
          Promise.resolve(mockIndexedDbData),
        );
        // New images upload one per request; existing images update in one request.
        imagesApiService.addImages.mockReturnValueOnce(of({ data: [newImages[0]] }));
        imagesApiService.addImages.mockReturnValueOnce(of({ data: [newImages[1]] }));
        imagesApiService.updateImages.mockReturnValue(
          of({ data: { newImages: [], updatedImages } }),
        );

        actions$.next(ImagesActions.updateAlbumRequested({ album }));

        effects.updateAlbum$.pipe(filter(isOutcome)).subscribe(action => {
          expect(action.type).toBe(ImagesActions.updateAlbumSucceeded.type);
          const payload = action as ReturnType<typeof ImagesActions.updateAlbumSucceeded>;
          expect(payload.album).toBe(album);
          expect(payload.newImages.length).toBe(2);
          expect(payload.updatedImages.length).toBe(1);
          expect(imagesApiService.addImages).toHaveBeenCalledTimes(2);
          expect(imagesApiService.updateImages).toHaveBeenCalledTimes(1);
          done();
        });
      }));

    it('should handle update album failure from API', () =>
      withDone(done => {
        mockImageFileService.getAllImages.mockReturnValue(
          Promise.resolve(mockIndexedDbData),
        );
        imagesApiService.addImages.mockReturnValue(throwError(() => mockError));
        imagesApiService.updateImages.mockReturnValue(
          of({ data: { newImages: [], updatedImages: [] } }),
        );

        actions$.next(ImagesActions.updateAlbumRequested({ album }));

        effects.updateAlbum$.pipe(filter(isOutcome)).subscribe(action => {
          expect(action.type).toBe(ImagesActions.updateAlbumFailed.type);
          done();
        });
      }));

    it('should report progress as each new image finishes uploading', async () => {
      mockImageFileService.getAllImages.mockReturnValue(
        Promise.resolve(mockIndexedDbData),
      );
      imagesApiService.addImages.mockReturnValueOnce(of({ data: [MOCK_IMAGES[0]] }));
      imagesApiService.addImages.mockReturnValueOnce(throwError(() => mockError));
      imagesApiService.updateImages.mockReturnValue(
        of({ data: { newImages: [], updatedImages: [] } }),
      );

      actions$.next(ImagesActions.updateAlbumRequested({ album }));
      const emitted = await firstValueFrom(effects.updateAlbum$.pipe(take(4), toArray()));

      expect(emitted.slice(0, 3)).toEqual([
        ImagesActions.imageUploadsProgressed({ uploaded: 0, total: 2 }),
        ImagesActions.imageUploadsProgressed({ uploaded: 1, total: 2 }),
        ImagesActions.imageUploadsProgressed({ uploaded: 2, total: 2 }),
      ]);
      expect(emitted[3].type).toBe(ImagesActions.updateAlbumFailed.type);
    });

    it('should not report upload progress when no new images are added', async () => {
      store.overrideSelector(ImagesSelectors.selectNewImagesFormData, {});
      store.refreshState();
      mockImageFileService.getAllImages.mockReturnValue(Promise.resolve([]));
      imagesApiService.updateImages.mockReturnValue(
        of({
          data: {
            newImages: [],
            updatedImages: [existingAlbumImage],
          },
        }),
      );

      actions$.next(ImagesActions.updateAlbumRequested({ album }));
      const action = await firstValueFrom(effects.updateAlbum$);

      expect(action.type).not.toBe(ImagesActions.imageUploadsProgressed.type);
      expect(imagesApiService.addImages).not.toHaveBeenCalled();
    });

    it('should fail when form data is missing for an image', () =>
      withDone(done => {
        store.overrideSelector(ImagesSelectors.selectNewImagesFormData, {
          'new-1': { ...INITIAL_IMAGE_FORM_DATA, id: 'new-1', album },
          // Missing 'new-2' form data
        });
        store.refreshState();

        mockImageFileService.getAllImages.mockReturnValue(
          Promise.resolve(mockIndexedDbData),
        );

        actions$.next(ImagesActions.updateAlbumRequested({ album }));

        effects.updateAlbum$.subscribe(action => {
          expect(action.type).toBe(ImagesActions.updateAlbumFailed.type);
          const payload = action as ReturnType<typeof ImagesActions.updateAlbumFailed>;
          expect(payload.error.message).toBe(
            'Mismatch between image file data and form data',
          );
          done();
        });
      }));
  });

  describe('automaticallyUpdateAlbumCoverAfterImageDeletion$', () => {
    const album = MOCK_IMAGES[0].album;
    const deletedImage = { ...MOCK_IMAGES[0], albumCover: true };
    const newCoverImage = { ...MOCK_IMAGES[1], album, albumCover: false };

    // Real factory selector selectImagesByAlbum(album) filters the seeded images
    // state by album, so seed only the candidate cover image in the target album.
    beforeEach(() => {
      store.setState({
        imagesState: {
          ...mockImagesState,
          ids: [newCoverImage.id],
          entities: {
            [newCoverImage.id]: {
              image: newCoverImage,
              formData: { ...INITIAL_IMAGE_FORM_DATA, id: newCoverImage.id },
            },
          },
        },
      });
      store.refreshState();
    });

    it('should automatically set new album cover after deleting current cover', () =>
      withDone(done => {
        const mockUpdateResponse: ApiResponse<{
          newImages: Image[];
          updatedImages: BaseImage[];
        }> = {
          data: {
            newImages: [],
            updatedImages: [
              {
                id: newCoverImage.id,
                filename: newCoverImage.filename,
                caption: newCoverImage.caption,
                album: newCoverImage.album,
                albumCover: true,
                albumOrdinality: newCoverImage.albumOrdinality,
                modificationInfo: newCoverImage.modificationInfo,
              },
            ],
          },
        };

        imagesApiService.updateImages.mockReturnValue(of(mockUpdateResponse));

        actions$.next(ImagesActions.deleteImageSucceeded({ image: deletedImage }));

        effects.automaticallyUpdateAlbumCoverAfterImageDeletion$.subscribe(action => {
          expect(action.type).toBe(ImagesActions.automaticAlbumCoverSwitchSucceeded.type);
          const payload = action as ReturnType<
            typeof ImagesActions.automaticAlbumCoverSwitchSucceeded
          >;
          expect(payload.baseImage.id).toBe(newCoverImage.id);
          expect(payload.baseImage.albumCover).toBe(true);
          done();
        });
      }));

    it('should not trigger when deleted image is not album cover', () =>
      withDone(done => {
        const nonCoverImage = { ...MOCK_IMAGES[0], albumCover: false };

        actions$.next(ImagesActions.deleteImageSucceeded({ image: nonCoverImage }));

        const subscription =
          effects.automaticallyUpdateAlbumCoverAfterImageDeletion$.subscribe(() => {
            done.fail('Should not dispatch action when deleted image is not album cover');
          });

        setTimeout(() => {
          subscription.unsubscribe();
          done();
        }, 100);
      }));

    it('should handle update failure with error counts mismatch', () =>
      withDone(done => {
        const mockUpdateResponse: ApiResponse<{
          newImages: Image[];
          updatedImages: BaseImage[];
        }> = {
          data: {
            newImages: [MOCK_IMAGES[0]], // Expected 0, got 1
            updatedImages: [],
          },
        };

        imagesApiService.updateImages.mockReturnValue(of(mockUpdateResponse));

        actions$.next(ImagesActions.deleteImageSucceeded({ image: deletedImage }));

        effects.automaticallyUpdateAlbumCoverAfterImageDeletion$.subscribe(action => {
          expect(action.type).toBe(ImagesActions.automaticAlbumCoverSwitchFailed.type);
          const payload = action as ReturnType<
            typeof ImagesActions.automaticAlbumCoverSwitchFailed
          >;
          expect(payload.error.message).toContain(
            'Expected 0 images to be added and 1 image to be updated',
          );
          done();
        });
      }));

    it('should handle API failure', () =>
      withDone(done => {
        imagesApiService.updateImages.mockReturnValue(throwError(() => mockError));
        mockParseError.mockReturnValue(mockError);

        actions$.next(ImagesActions.deleteImageSucceeded({ image: deletedImage }));

        effects.automaticallyUpdateAlbumCoverAfterImageDeletion$.subscribe(action => {
          expect(action.type).toBe(ImagesActions.automaticAlbumCoverSwitchFailed.type);
          done();
        });
      }));
  });

  describe('deleteImage$', () => {
    it('should delete image successfully', () =>
      withDone(done => {
        const mockDeleteResponse: ApiResponse<Id> = { data: MOCK_IMAGES[0].id };
        imagesApiService.deleteImage.mockReturnValue(of(mockDeleteResponse));

        actions$.next(ImagesActions.deleteImageRequested({ image: MOCK_IMAGES[0] }));

        effects.deleteImage$.subscribe(action => {
          expect(action).toEqual(
            ImagesActions.deleteImageSucceeded({ image: MOCK_IMAGES[0] }),
          );
          expect(imagesApiService.deleteImage).toHaveBeenCalledWith(MOCK_IMAGES[0].id);
          done();
        });
      }));

    it('should handle delete image failure', () =>
      withDone(done => {
        imagesApiService.deleteImage.mockReturnValue(throwError(() => mockError));
        mockParseError.mockReturnValue(mockError);

        actions$.next(ImagesActions.deleteImageRequested({ image: MOCK_IMAGES[0] }));

        effects.deleteImage$.subscribe(action => {
          expect(action).toEqual(
            ImagesActions.deleteImageFailed({ image: MOCK_IMAGES[0], error: mockError }),
          );
          done();
        });
      }));
  });

  describe('deleteAlbum$', () => {
    it('should delete album successfully', () =>
      withDone(done => {
        const albumName = 'Test Album';
        const imageIds = [MOCK_IMAGES[0].id, MOCK_IMAGES[1].id];
        const mockDeleteResponse: ApiResponse<Id[]> = { data: imageIds };
        imagesApiService.deleteAlbum.mockReturnValue(of(mockDeleteResponse));

        actions$.next(ImagesActions.deleteAlbumRequested({ album: albumName }));

        effects.deleteAlbum$.subscribe(action => {
          expect(action).toEqual(
            ImagesActions.deleteAlbumSucceeded({ album: albumName, imageIds }),
          );
          expect(imagesApiService.deleteAlbum).toHaveBeenCalledWith(albumName);
          done();
        });
      }));

    it('should handle delete album failure', () =>
      withDone(done => {
        const albumName = 'Test Album';
        imagesApiService.deleteAlbum.mockReturnValue(throwError(() => mockError));
        mockParseError.mockReturnValue(mockError);

        actions$.next(ImagesActions.deleteAlbumRequested({ album: albumName }));

        effects.deleteAlbum$.subscribe(action => {
          expect(action).toEqual(
            ImagesActions.deleteAlbumFailed({ album: albumName, error: mockError }),
          );
          done();
        });
      }));
  });

  function imagesStateWith(images: Image[], lastMetadataFetch: string | null = null) {
    return {
      ...mockImagesState,
      ids: images.map(image => image.id),
      entities: Object.fromEntries(
        images.map(image => [
          image.id,
          { image, formData: { ...INITIAL_IMAGE_FORM_DATA, id: image.id } },
        ]),
      ),
      lastMetadataFetch,
    };
  }

  function collect(effect$: Observable<Action>): Action[] {
    const results: Action[] = [];
    effect$.subscribe(action => results.push(action));
    return results;
  }

  describe('fetchAlbumThumbnailImages$', () => {
    const album = 'Club Night';
    const albumImages = [
      { ...MOCK_IMAGES[0], album },
      { ...MOCK_IMAGES[1], album },
    ];
    const albumIds = albumImages.map(image => image.id);

    beforeEach(() => {
      store.setState({
        imagesState: imagesStateWith([...albumImages, MOCK_IMAGES[2]], '2026-01-01'),
      });
    });

    it('should fetch the thumbnails of every image in the album', async () => {
      imagesApiService.getBatchThumbnailImages.mockReturnValue(of({ data: albumImages }));

      actions$.next(ImagesActions.fetchAlbumThumbnailsRequested({ album }));
      const action = await firstValueFrom(effects.fetchAlbumThumbnailImages$);

      expect(imagesApiService.getBatchThumbnailImages).toHaveBeenCalledWith(albumIds);
      expect(action).toEqual(
        ImagesActions.fetchBatchThumbnailsSucceeded({
          images: albumImages,
          context: 'photos-in-album',
        }),
      );
    });

    it('should load the metadata first when it has never been fetched', async () => {
      store.setState({ imagesState: imagesStateWith(albumImages, null) });
      const dispatchSpy = vi.spyOn(store, 'dispatch');
      imagesApiService.getBatchThumbnailImages.mockReturnValue(of({ data: albumImages }));
      actions$.next(ImagesActions.fetchAlbumThumbnailsRequested({ album }));
      const action = firstValueFrom(effects.fetchAlbumThumbnailImages$);

      expect(dispatchSpy).toHaveBeenCalledWith(
        ImagesActions.fetchAllImagesMetadataRequested(),
      );
      expect(imagesApiService.getBatchThumbnailImages).not.toHaveBeenCalled();

      actions$.next(ImagesActions.fetchAllImagesMetadataFailed({ error: mockError }));

      await expect(action).resolves.toEqual(
        ImagesActions.fetchBatchThumbnailsSucceeded({
          images: albumImages,
          context: 'photos-in-album',
        }),
      );
    });

    it('should report a failed thumbnail fetch', async () => {
      imagesApiService.getBatchThumbnailImages.mockReturnValue(
        throwError(() => mockError),
      );

      actions$.next(ImagesActions.fetchAlbumThumbnailsRequested({ album }));
      const action = await firstValueFrom(effects.fetchAlbumThumbnailImages$);

      expect(action).toEqual(
        ImagesActions.fetchBatchThumbnailsFailed({ error: mockError }),
      );
    });

    it('should not fetch anything for an empty album', () => {
      actions$.next(ImagesActions.fetchAlbumThumbnailsRequested({ album: 'Empty' }));
      const results = collect(effects.fetchAlbumThumbnailImages$);

      expect(results).toEqual([]);
      expect(imagesApiService.getBatchThumbnailImages).not.toHaveBeenCalled();
    });
  });

  describe('fetchArticleBannerThumbnails$', () => {
    const bannerlessImage: Image = { ...MOCK_IMAGES[0], thumbnailUrl: undefined };
    const homeArticle: Article = {
      ...MOCK_ARTICLES[0],
      bannerImageId: bannerlessImage.id,
    };

    beforeEach(() => {
      store.overrideSelector(ArticlesSelectors.selectHomePageArticles, [homeArticle]);
      store.overrideSelector(ArticlesSelectors.selectFilteredArticles, []);
      store.refreshState();
    });

    it('should request the banner thumbnails that are missing', async () => {
      store.setState({ imagesState: imagesStateWith([bannerlessImage]) });

      actions$.next(
        ArticlesActions.fetchHomePageArticlesSucceeded({
          articles: [homeArticle],
          totalCount: 1,
        }),
      );
      const action = await firstValueFrom(effects.fetchArticleBannerThumbnails$);

      expect(action).toEqual(
        ImagesActions.fetchBatchThumbnailsRequested({
          imageIds: [bannerlessImage.id],
          context: 'article-banner-images',
        }),
      );
    });

    it('should not request anything when every banner thumbnail is fresh', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
      store.setState({
        imagesState: imagesStateWith([
          {
            ...bannerlessImage,
            thumbnailUrl: 'https://example.com/thumb.jpg',
            urlExpirationDate: '2026-01-01T10:00:00Z',
          },
        ]),
      });

      actions$.next(
        ArticlesActions.fetchFilteredArticlesSucceeded({
          articles: [homeArticle],
          filteredCount: 1,
          totalCount: 1,
        }),
      );
      const results = collect(effects.fetchArticleBannerThumbnails$);

      expect(results).toEqual([]);
    });
  });

  describe('fetchArticleImages$', () => {
    const bannerId = 'aaaaaaaaaaaaaaaaaaaaaaaa';
    const freshId = 'bbbbbbbbbbbbbbbbbbbbbbbb';
    const expiringId = 'cccccccccccccccccccccccc';
    const undatedId = 'dddddddddddddddddddddddd';
    const missingId = 'eeeeeeeeeeeeeeeeeeeeeeee';
    const article: Article = {
      ...MOCK_ARTICLES[0],
      bannerImageId: bannerId,
      body: `{{{${freshId}}}} {{{${expiringId}}}} {{{${undatedId}}}} {{{${missingId}}}}`,
    };
    const otherArticle: Article = {
      ...MOCK_ARTICLES[1],
      bannerImageId: missingId,
      body: '',
    };
    const image = (id: string, overrides: Partial<Image>): Image => ({
      ...MOCK_IMAGES[1],
      id,
      mainUrl: 'https://example.com/main.jpg',
      urlExpirationDate: '2026-01-01T12:00:00Z',
      ...overrides,
    });

    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-01-01T06:00:00Z'));
      store.setState({
        articlesState: {
          ...articlesInitialState,
          ids: [article.id, otherArticle.id],
          entities: Object.fromEntries(
            [article, otherArticle].map(entry => [
              entry.id,
              {
                article: entry,
                formData: {
                  title: entry.title,
                  body: entry.body,
                  bannerImageId: entry.bannerImageId,
                },
              },
            ]),
          ),
        },
        imagesState: imagesStateWith([
          image(bannerId, { mainUrl: undefined }),
          image(freshId, {}),
          image(expiringId, { urlExpirationDate: '2026-01-01T07:00:00Z' }),
          image(undatedId, { urlExpirationDate: undefined }),
        ]),
      });
    });

    const requested = (...imageIds: string[]) =>
      imageIds.map(imageId =>
        ImagesActions.fetchMainImageInBackgroundRequested({ imageId }),
      );

    it('should refresh the images of a fetched article that are missing or expiring', () => {
      actions$.next(ArticlesActions.fetchArticleSucceeded({ article }));
      const results = collect(effects.fetchArticleImages$);

      expect(results).toEqual(requested(bannerId, expiringId, undatedId, missingId));
    });

    it('should only check the article whose form changed', () => {
      actions$.next(
        ArticlesActions.formDataChanged({ articleId: otherArticle.id, formData: {} }),
      );
      const results = collect(effects.fetchArticleImages$);

      expect(results).toEqual(requested(missingId));
    });

    it('should check every stored article after a metadata refresh', () => {
      actions$.next(ImagesActions.fetchAllImagesMetadataSucceeded({ images: [] }));
      const results = collect(effects.fetchArticleImages$);

      expect(results).toEqual(
        requested(bannerId, expiringId, undatedId, missingId, missingId),
      );
    });
  });

  describe('refetchFilteredThumbnails$ periodic check', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    it.each(['/photo-gallery', '/album/club-night', '/image/abc'])(
      'should refetch expired thumbnails while on %s',
      path => {
        store.overrideSelector(NavSelectors.selectCurrentPath, path);
        mockIsExpired.mockReturnValue(true);

        const results = collect(effects.refetchFilteredThumbnails$);
        vi.advanceTimersByTime(0);

        expect(results).toEqual([ImagesActions.fetchFilteredThumbnailsRequested()]);
      },
    );

    it.each([
      ['on a page without thumbnails', '/news', true],
      ['without a current page', null, true],
      ['while the thumbnails are fresh', '/photo-gallery', false],
    ])('should not refetch %s', (_label, path, expired) => {
      store.overrideSelector(NavSelectors.selectCurrentPath, path);
      mockIsExpired.mockReturnValue(expired);

      const results = collect(effects.refetchFilteredThumbnails$);
      vi.advanceTimersByTime(0);

      expect(results).toEqual([]);
    });
  });

  describe('retryFailedArticleBannerImages$', () => {
    const bannerlessImage: Image = { ...MOCK_IMAGES[0], thumbnailUrl: undefined };
    const bannerArticle: Article = {
      ...MOCK_ARTICLES[0],
      bannerImageId: bannerlessImage.id,
    };
    const expectedAction = ImagesActions.fetchBatchThumbnailsRequested({
      imageIds: [bannerlessImage.id],
      context: 'article-banner-images',
    });

    beforeEach(() => {
      vi.useFakeTimers();
      store.setState({ imagesState: imagesStateWith([bannerlessImage]) });
      store.overrideSelector(ArticlesSelectors.selectHomePageArticles, [bannerArticle]);
      store.overrideSelector(ArticlesSelectors.selectFilteredArticles, [
        { ...MOCK_ARTICLES[1], bannerImageId: '' },
      ]);
    });

    it.each(['', '/', '/news'])(
      'should retry missing banner thumbnails five minutes after starting on "%s"',
      path => {
        store.overrideSelector(NavSelectors.selectCurrentPath, path);
        store.refreshState();
        const results = collect(effects.retryFailedArticleBannerImages$);

        vi.advanceTimersByTime(5 * 60 * 1000 - 1);

        expect(results).toEqual([]);

        vi.advanceTimersByTime(1);

        expect(results).toEqual([expectedAction]);
      },
    );

    it('should not retry on a page without article banners', () => {
      store.overrideSelector(NavSelectors.selectCurrentPath, '/members');
      store.refreshState();
      const results = collect(effects.retryFailedArticleBannerImages$);

      vi.advanceTimersByTime(15 * 60 * 1000);

      expect(results).toEqual([]);
    });

    it('should not retry when no banner thumbnail is missing', () => {
      store.overrideSelector(NavSelectors.selectCurrentPath, '/');
      store.overrideSelector(ArticlesSelectors.selectHomePageArticles, []);
      store.refreshState();
      const results = collect(effects.retryFailedArticleBannerImages$);

      vi.advanceTimersByTime(5 * 60 * 1000);

      expect(results).toEqual([]);
    });
  });

  describe('addImage$', () => {
    const imageFile = new File(['image'], 'photo.jpg', { type: 'image/jpeg' });
    const formData = {
      ...INITIAL_IMAGE_FORM_DATA,
      id: 'new-1',
      filename: 'photo.jpg',
      caption: 'A photo',
      album: 'Club Night',
      albumCover: false,
    };
    let mockImageFileService: Mocked<ImageFileService>;

    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
      mockImageFileService = TestBed.inject(ImageFileService) as Mocked<ImageFileService>;
      mockImageFileService.getImage.mockResolvedValue({
        id: 'new-1',
        filename: 'photo.jpg',
        dataUrl: 'data:image/jpeg;base64,abc',
      });
      mockDataUrlToFile.mockReturnValue(imageFile);
      store.overrideSelector(AuthSelectors.selectUser, mockUser);
      store.overrideSelector(ImagesSelectors.selectNewImageFormData, formData);
      store.overrideSelector(ImagesSelectors.selectAllExistingAlbums, ['Club Night']);
      store.refreshState();
    });

    const sentMetadata = (): BaseImage => {
      const sent = imagesApiService.addImages.mock.calls[0][0];
      return JSON.parse(String(sent.get('imageMetadata')));
    };

    it('should upload the staged image with its form data', async () => {
      imagesApiService.addImages.mockReturnValue(of({ data: [MOCK_IMAGES[0]] }));

      actions$.next(ImagesActions.addImageRequested({ imageId: 'new-1' }));
      const action = await firstValueFrom(effects.addImage$);

      expect(action).toEqual(ImagesActions.addImageSucceeded({ image: MOCK_IMAGES[0] }));
      expect(imagesApiService.addImages.mock.calls[0][0].get('files')).toBe(imageFile);
      expect(sentMetadata()).toEqual({
        id: 'new-1',
        filename: 'photo.jpg',
        caption: 'A photo',
        album: 'Club Night',
        albumCover: false,
        albumOrdinality: formData.albumOrdinality,
        modificationInfo: {
          createdBy: 'Test User',
          createdByNumber: null,
          dateCreated: '2026-01-01T00:00:00.000Z',
          lastEditedBy: 'Test User',
          lastEditedByNumber: null,
          dateLastEdited: '2026-01-01T00:00:00.000Z',
        },
      });
    });

    it('should make the first image of a new album its cover', async () => {
      store.overrideSelector(ImagesSelectors.selectAllExistingAlbums, []);
      store.refreshState();
      imagesApiService.addImages.mockReturnValue(of({ data: [MOCK_IMAGES[0]] }));

      actions$.next(ImagesActions.addImageRequested({ imageId: 'new-1' }));
      await firstValueFrom(effects.addImage$);

      expect(sentMetadata().albumCover).toBe(true);
    });

    it('should fail when the staged image cannot be read', async () => {
      mockImageFileService.getImage.mockResolvedValue(mockError);
      mockIsLccError.mockImplementation(value => value === mockError);

      actions$.next(ImagesActions.addImageRequested({ imageId: 'new-1' }));
      const action = await firstValueFrom(effects.addImage$);

      expect(action).toEqual(ImagesActions.addImageFailed({ error: mockError }));
      expect(imagesApiService.addImages).not.toHaveBeenCalled();
    });

    it('should fail when the staged image cannot be turned into a file', async () => {
      mockDataUrlToFile.mockReturnValue(null);

      actions$.next(ImagesActions.addImageRequested({ imageId: 'new-1' }));
      const action = await firstValueFrom(effects.addImage$);

      expect(action.type).toBe(ImagesActions.addImageFailed.type);
      expect(imagesApiService.addImages).not.toHaveBeenCalled();
    });

    it('should report a failed upload', async () => {
      imagesApiService.addImages.mockReturnValue(throwError(() => mockError));

      actions$.next(ImagesActions.addImageRequested({ imageId: 'new-1' }));
      const action = await firstValueFrom(effects.addImage$);

      expect(action).toEqual(ImagesActions.addImageFailed({ error: mockError }));
      expect(mockParseError).toHaveBeenCalledWith(mockError);
    });
  });

  describe('addImages$ before uploading', () => {
    let mockImageFileService: Mocked<ImageFileService>;

    beforeEach(() => {
      mockImageFileService = TestBed.inject(ImageFileService) as Mocked<ImageFileService>;
      store.overrideSelector(AuthSelectors.selectUser, mockUser);
      store.overrideSelector(ImagesSelectors.selectNewImagesFormData, {});
      store.refreshState();
    });

    it('should fail when the staged images cannot be read', async () => {
      mockImageFileService.getAllImages.mockResolvedValue(mockError);
      mockIsLccError.mockImplementation(value => value === mockError);

      actions$.next(ImagesActions.addImagesRequested());
      const action = await firstValueFrom(effects.addImages$);

      expect(action).toEqual(ImagesActions.addImagesFailed({ error: mockError }));
    });

    it('should fail when a staged image has no form data', async () => {
      mockImageFileService.getAllImages.mockResolvedValue([
        { id: 'new-1', filename: 'orphan.jpg', dataUrl: 'data:image/jpeg;base64,abc' },
      ]);

      actions$.next(ImagesActions.addImagesRequested());
      const action = await firstValueFrom(effects.addImages$);

      expect(action.type).toBe(ImagesActions.addImagesFailed.type);
      expect(imagesApiService.addImages).not.toHaveBeenCalled();
    });
  });

  describe('updating images without valid form data', () => {
    beforeEach(() => {
      store.overrideSelector(AuthSelectors.selectUser, mockUser);
      mockBuildImagesFormData.mockReturnValue(mockError);
      mockIsLccError.mockImplementation(value => value === mockError);
    });

    it('should fail an image update without calling the API', async () => {
      store.setState({ imagesState: imagesStateWith([MOCK_IMAGES[0]]) });
      store.refreshState();

      actions$.next(ImagesActions.updateImageRequested({ imageId: MOCK_IMAGES[0].id }));
      const action = await firstValueFrom(effects.updateImage$);

      expect(action).toEqual(
        ImagesActions.updateImageFailed({
          baseImage: expect.objectContaining({ id: MOCK_IMAGES[0].id }),
          error: mockError,
        }),
      );
      expect(imagesApiService.updateImages).not.toHaveBeenCalled();
    });

    it('should fail the automatic album cover switch without calling the API', async () => {
      const deletedCover = { ...MOCK_IMAGES[0], album: 'Club Night', albumCover: true };
      store.setState({
        imagesState: imagesStateWith([{ ...MOCK_IMAGES[1], album: 'Club Night' }]),
      });

      actions$.next(ImagesActions.deleteImageSucceeded({ image: deletedCover }));
      const action = await firstValueFrom(
        effects.automaticallyUpdateAlbumCoverAfterImageDeletion$,
      );

      expect(action).toEqual(
        ImagesActions.automaticAlbumCoverSwitchFailed({
          album: 'Club Night',
          error: mockError,
        }),
      );
      expect(imagesApiService.updateImages).not.toHaveBeenCalled();
    });
  });

  describe('updateAlbum$ with only existing images', () => {
    const album = 'Club Night';
    const failure = ImagesActions.updateAlbumFailed({
      album,
      error: { name: 'LCCError', message: '1 image operation failed' },
    });

    beforeEach(() => {
      const mockImageFileService = TestBed.inject(
        ImageFileService,
      ) as Mocked<ImageFileService>;
      mockImageFileService.getAllImages.mockResolvedValue([]);
      store.overrideSelector(AuthSelectors.selectUser, mockUser);
      store.overrideSelector(ImagesSelectors.selectNewImagesFormData, {});
      store.setState({
        imagesState: imagesStateWith([{ ...MOCK_IMAGES[0], album }]),
      });
      store.refreshState();
    });

    it('should fail when the album edits cannot be packaged', async () => {
      mockBuildImagesFormData.mockReturnValue(mockError);
      mockIsLccError.mockImplementation(value => value === mockError);

      actions$.next(ImagesActions.updateAlbumRequested({ album }));
      const action = await firstValueFrom(effects.updateAlbum$);

      expect(action).toEqual(failure);
      expect(imagesApiService.updateImages).not.toHaveBeenCalled();
    });

    it('should fail when the album edits are rejected', async () => {
      imagesApiService.updateImages.mockReturnValue(throwError(() => mockError));

      actions$.next(ImagesActions.updateAlbumRequested({ album }));
      const action = await firstValueFrom(effects.updateAlbum$);

      expect(action).toEqual(failure);
    });
  });

  describe('clearIndexedDbImageFileData$', () => {
    it.each([
      ImagesActions.imageFormDataRestored({ imageId: null }),
      ImagesActions.albumFormDataRestored({ album: null }),
    ])('should clear the staged image files on $type', action => {
      const mockImageFileService = TestBed.inject(
        ImageFileService,
      ) as Mocked<ImageFileService>;

      actions$.next(action);
      collect(effects.clearIndexedDbImageFileData$);

      expect(mockImageFileService.clearAllImages).toHaveBeenCalledTimes(1);
    });
  });
});
