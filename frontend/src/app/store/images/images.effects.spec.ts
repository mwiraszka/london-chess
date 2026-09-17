import { provideMockActions } from '@ngrx/effects/testing';
import { Action } from '@ngrx/store';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import moment from 'moment-timezone';
import { ReplaySubject, firstValueFrom, of, throwError } from 'rxjs';
import { filter, take, toArray } from 'rxjs/operators';

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { INITIAL_IMAGE_FORM_DATA } from '@app/constants';
import { MOCK_IMAGES } from '@app/mocks/images.mock';
import {
  ApiResponse,
  BaseImage,
  Id,
  Image,
  LccError,
  PaginatedItems,
  User,
} from '@app/models';
import { ImageFileService, ImagesApiService, UserService } from '@app/services';
import { AuthSelectors } from '@app/store/auth';
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
});
