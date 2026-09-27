import { pick } from 'lodash';

import {
  BASE_IMAGE_PROPERTIES,
  IMAGE_FORM_DATA_PROPERTIES,
  INITIAL_IMAGE_FORM_DATA,
} from '@app/constants';
import { MOCK_IMAGES } from '@app/mocks/images.mock';
import { Image, LccError } from '@app/models';
import { BaseImage } from '@app/models/image.model';

import * as ImagesActions from './images.actions';
import {
  ImagesState,
  imagesAdapter,
  imagesReducer,
  initialState,
} from './images.reducer';

describe('Images Reducer', () => {
  const mockBaseImage: BaseImage = pick(MOCK_IMAGES[0], BASE_IMAGE_PROPERTIES);
  const mockError: LccError = {
    name: 'LCCError',
    message: 'Something went wrong',
  };
  const now = '2026-03-01T12:00:00.000Z';

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(now));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('unknown action', () => {
    it('should return the default state', () => {
      const action = { type: 'Unknown' };
      const state = imagesReducer(initialState, action);

      expect(state).toBe(initialState);
    });
  });

  describe('failed loads', () => {
    it('should record each load whose request fails', () => {
      const actions = [
        ImagesActions.fetchAllImagesMetadataFailed({ error: mockError }),
        ImagesActions.fetchFilteredThumbnailsFailed({ error: mockError }),
        ImagesActions.fetchMainImageFailed({ error: mockError }),
      ];

      const state = actions.reduce(imagesReducer, initialState);

      expect(state.failedLoads).toEqual(['metadata', 'filteredThumbnails', 'mainImage']);
    });

    it.each([
      [ImagesActions.fetchAllImagesMetadataRequested(), 'metadata'],
      [ImagesActions.fetchFilteredThumbnailsRequested(), 'filteredThumbnails'],
      [
        ImagesActions.fetchMainImageRequested({ imageId: MOCK_IMAGES[0].id }),
        'mainImage',
      ],
    ] as const)(
      'should forget a failure once its load is attempted again (%#)',
      (action, load) => {
        const previousState: ImagesState = {
          ...initialState,
          failedLoads: ['metadata', 'filteredThumbnails', 'mainImage'],
        };

        const state = imagesReducer(previousState, action);

        expect(state.failedLoads).toHaveLength(2);
        expect(state.failedLoads).not.toContain(load);
      },
    );

    it('should not record a failure for images fetched ahead of time', () => {
      const action = ImagesActions.fetchMainImageInBackgroundFailed({ error: mockError });

      const state = imagesReducer(initialState, action);

      expect(state).toBe(initialState);
    });

    it('should leave loads untouched when a change fails to save', () => {
      const actions = [
        ImagesActions.fetchBatchThumbnailsFailed({ error: mockError }),
        ImagesActions.addImageFailed({ error: mockError }),
        ImagesActions.updateImageFailed({ baseImage: mockBaseImage, error: mockError }),
        ImagesActions.deleteImageFailed({ image: MOCK_IMAGES[0], error: mockError }),
        ImagesActions.deleteAlbumFailed({ album: 'Test Album', error: mockError }),
      ];

      const state = actions.reduce(imagesReducer, initialState);

      expect(state).toEqual(initialState);
    });
  });

  describe('uploadProgress', () => {
    it('should track how many images have uploaded', () => {
      const action = ImagesActions.imageUploadsProgressed({ uploaded: 2, total: 5 });

      const state = imagesReducer(initialState, action);

      expect(state.uploadProgress).toEqual({ uploaded: 2, total: 5 });
    });

    it('should clear the progress once the uploads settle', () => {
      const uploadingState: ImagesState = {
        ...initialState,
        uploadProgress: { uploaded: 5, total: 5 },
      };
      const outcomes = [
        ImagesActions.addImagesSucceeded({ images: [] }),
        ImagesActions.addImagesFailed({ error: mockError }),
        ImagesActions.updateAlbumSucceeded({
          album: 'Test Album',
          newImages: [],
          updatedImages: [],
        }),
        ImagesActions.updateAlbumFailed({ album: 'Test Album', error: mockError }),
      ];

      const states = outcomes.map(outcome => imagesReducer(uploadingState, outcome));

      states.forEach(state => expect(state.uploadProgress).toBeNull());
    });
  });

  describe('fetchAllImagesMetadataSucceeded', () => {
    it('should upsert base images with metadata only', () => {
      const images = [mockBaseImage];
      const action = ImagesActions.fetchAllImagesMetadataSucceeded({ images });
      const state = imagesReducer(initialState, action);

      expect(state.ids.length).toBe(1);
      expect(state.entities['mock-id-1']?.image).toMatchObject(mockBaseImage);
      expect(state.lastMetadataFetch).toBe(now);
    });

    it('should preserve existing URLs when upserting metadata', () => {
      const previousState: ImagesState = imagesAdapter.upsertOne(
        {
          image: MOCK_IMAGES[0],
          formData: {
            id: MOCK_IMAGES[0].id,
            filename: MOCK_IMAGES[0].filename,
            caption: MOCK_IMAGES[0].caption,
            album: MOCK_IMAGES[0].album,
            albumCover: MOCK_IMAGES[0].albumCover,
            albumOrdinality: MOCK_IMAGES[0].albumOrdinality,
          },
        },
        initialState,
      );

      const updatedBaseImage = { ...mockBaseImage, caption: 'Updated Caption' };
      const action = ImagesActions.fetchAllImagesMetadataSucceeded({
        images: [updatedBaseImage],
      });
      const state = imagesReducer(previousState, action);

      expect(state.entities['mock-id-1']?.image.mainUrl).toBe(MOCK_IMAGES[0].mainUrl);
      expect(state.entities['mock-id-1']?.image.thumbnailUrl).toBe(
        MOCK_IMAGES[0].thumbnailUrl,
      );
      expect(state.entities['mock-id-1']?.image.caption).toBe('Updated Caption');
    });
  });

  describe('fetchFilteredThumbnailsSucceeded', () => {
    it('should upsert images and update filteredImages', () => {
      const images = [MOCK_IMAGES[0]];
      const action = ImagesActions.fetchFilteredThumbnailsSucceeded({
        images,
        filteredCount: 1,
        totalCount: 10,
      });
      const state = imagesReducer(initialState, action);

      expect(state.entities['mock-id-1']?.image).toEqual(MOCK_IMAGES[0]);
      expect(state.filteredImages).toEqual(images);
      expect(state.filteredCount).toBe(1);
      expect(state.totalCount).toBe(10);
      expect(state.lastFilteredThumbnailsFetch).toBe(now);
    });
  });

  describe('fetchBatchThumbnailsSucceeded', () => {
    it('should upsert batch of images', () => {
      const images = [MOCK_IMAGES[0], MOCK_IMAGES[1]];
      const action = ImagesActions.fetchBatchThumbnailsSucceeded({
        images,
        context: 'album-covers',
      });
      const state = imagesReducer(initialState, action);

      expect(state.ids.length).toBe(2);
      expect(state.entities['mock-id-1']?.image).toMatchObject({
        id: MOCK_IMAGES[0].id,
        thumbnailUrl: MOCK_IMAGES[0].thumbnailUrl,
      });
      expect(state.entities['mock-id-2']?.image).toMatchObject({
        id: MOCK_IMAGES[1].id,
        thumbnailUrl: MOCK_IMAGES[1].thumbnailUrl,
      });
    });

    it('should update lastAlbumCoversFetch when context is album-covers', () => {
      const action = ImagesActions.fetchBatchThumbnailsSucceeded({
        images: [MOCK_IMAGES[0]],
        context: 'album-covers',
      });
      const state = imagesReducer(initialState, action);

      expect(state.lastAlbumCoversFetch).toBe(now);
    });

    it('should not update lastAlbumCoversFetch for other contexts', () => {
      const action = ImagesActions.fetchBatchThumbnailsSucceeded({
        images: [MOCK_IMAGES[0]],
        context: 'article-banner-images',
      });
      const state = imagesReducer(initialState, action);

      expect(state.lastAlbumCoversFetch).toBeNull();
    });
  });

  describe('paginationOptionsChanged', () => {
    it('should update pagination options', () => {
      const newOptions = {
        ...initialState.options,
        page: 2,
        pageSize: 40,
      };

      const action = ImagesActions.paginationOptionsChanged({
        options: newOptions,
        fetch: false,
      });
      const state = imagesReducer(initialState, action);

      expect(state.options.page).toBe(2);
      expect(state.options.pageSize).toBe(40);
    });

    it('should keep the shown page loaded until the next one arrives', () => {
      const previousState: ImagesState = {
        ...initialState,
        lastFilteredThumbnailsFetch: '2025-01-01T00:00:00.000Z',
      };

      const action = ImagesActions.paginationOptionsChanged({
        options: { ...initialState.options, page: 2 },
        fetch: true,
      });
      const state = imagesReducer(previousState, action);

      expect(state.lastFilteredThumbnailsFetch).toBe('2025-01-01T00:00:00.000Z');
    });
  });

  describe('fetchMainImageSucceeded', () => {
    it('should add image with mainUrl to state', () => {
      const action = ImagesActions.fetchMainImageSucceeded({ image: MOCK_IMAGES[0] });
      const state = imagesReducer(initialState, action);

      expect(state.entities['mock-id-1']?.image).toEqual({
        ...MOCK_IMAGES[0],
        thumbnailUrl: undefined,
      });
    });

    it('should preserve an existing thumbnail URL and keep the earlier expiration', () => {
      const existing = {
        ...MOCK_IMAGES[0],
        mainUrl: undefined,
        thumbnailUrl: 'https://example.com/existing-thumb.jpg',
        urlExpirationDate: '2026-01-01T00:00:00.000Z',
      };
      const previousState = imagesReducer(
        initialState,
        ImagesActions.fetchBatchThumbnailsSucceeded({
          images: [existing],
          context: 'album-covers',
        }),
      );
      const incoming = {
        ...MOCK_IMAGES[0],
        mainUrl: 'https://example.com/fresh-main.jpg',
        thumbnailUrl: undefined,
        urlExpirationDate: '2026-01-02T00:00:00.000Z',
      };

      const state = imagesReducer(
        previousState,
        ImagesActions.fetchMainImageSucceeded({ image: incoming }),
      );

      const image = state.entities['mock-id-1']?.image;
      expect(image?.mainUrl).toBe('https://example.com/fresh-main.jpg');
      expect(image?.thumbnailUrl).toBe('https://example.com/existing-thumb.jpg');
      expect(image?.urlExpirationDate).toBe('2026-01-01T00:00:00.000Z');
    });

    it('should update mainUrl but preserve formData', () => {
      const existingFormData = {
        id: MOCK_IMAGES[0].id,
        filename: MOCK_IMAGES[0].filename,
        caption: 'Modified Caption',
        album: MOCK_IMAGES[0].album,
        albumCover: MOCK_IMAGES[0].albumCover,
        albumOrdinality: MOCK_IMAGES[0].albumOrdinality,
      };

      const previousState: ImagesState = imagesAdapter.upsertOne(
        {
          image: { ...MOCK_IMAGES[0], mainUrl: undefined },
          formData: existingFormData,
        },
        initialState,
      );

      const action = ImagesActions.fetchMainImageSucceeded({ image: MOCK_IMAGES[0] });
      const state = imagesReducer(previousState, action);

      expect(state.entities['mock-id-1']?.image.mainUrl).toBe(MOCK_IMAGES[0].mainUrl);
      expect(state.entities['mock-id-1']?.formData).toEqual(existingFormData);
    });
  });

  describe('addImageSucceeded', () => {
    it('should add new image to state', () => {
      const action = ImagesActions.addImageSucceeded({ image: MOCK_IMAGES[0] });
      const state = imagesReducer(initialState, action);

      expect(state.entities['mock-id-1']?.image).toEqual(MOCK_IMAGES[0]);
    });

    it('should reset newImagesFormData and keep the shown lists loaded', () => {
      const previousState: ImagesState = {
        ...initialState,
        newImagesFormData: {
          'new-1': INITIAL_IMAGE_FORM_DATA,
        },
        lastFilteredThumbnailsFetch: '2025-01-01T00:00:00.000Z',
        lastAlbumCoversFetch: '2025-01-01T00:00:00.000Z',
        lastMetadataFetch: '2025-01-01T00:00:00.000Z',
      };

      const action = ImagesActions.addImageSucceeded({ image: MOCK_IMAGES[0] });
      const state = imagesReducer(previousState, action);

      expect(state.newImagesFormData).toEqual({});
      expect(state.lastFilteredThumbnailsFetch).toBe('2025-01-01T00:00:00.000Z');
      expect(state.lastAlbumCoversFetch).toBe('2025-01-01T00:00:00.000Z');
      expect(state.lastMetadataFetch).toBe('2025-01-01T00:00:00.000Z');
    });
  });

  describe('addImagesSucceeded', () => {
    it('should add multiple images to state', () => {
      const images = [MOCK_IMAGES[0], MOCK_IMAGES[1]];
      const action = ImagesActions.addImagesSucceeded({ images });
      const state = imagesReducer(initialState, action);

      expect(state.ids.length).toBe(2);
      expect(state.entities['mock-id-1']?.image).toEqual(MOCK_IMAGES[0]);
      expect(state.entities['mock-id-2']?.image).toEqual(MOCK_IMAGES[1]);
    });

    it('should reset newImagesFormData', () => {
      const previousState: ImagesState = {
        ...initialState,
        newImagesFormData: {
          'new-1': INITIAL_IMAGE_FORM_DATA,
          'new-2': INITIAL_IMAGE_FORM_DATA,
        },
      };

      const action = ImagesActions.addImagesSucceeded({ images: [MOCK_IMAGES[0]] });
      const state = imagesReducer(previousState, action);

      expect(state.newImagesFormData).toEqual({});
    });
  });

  describe('updateImageSucceeded', () => {
    it('should update existing image', () => {
      const previousState: ImagesState = imagesAdapter.upsertOne(
        {
          image: MOCK_IMAGES[0],
          formData: {
            id: MOCK_IMAGES[0].id,
            filename: MOCK_IMAGES[0].filename,
            caption: MOCK_IMAGES[0].caption,
            album: MOCK_IMAGES[0].album,
            albumCover: MOCK_IMAGES[0].albumCover,
            albumOrdinality: MOCK_IMAGES[0].albumOrdinality,
          },
        },
        initialState,
      );

      const updatedBaseImage: BaseImage = {
        ...mockBaseImage,
        caption: 'Updated Caption',
      };
      const action = ImagesActions.updateImageSucceeded({ baseImage: updatedBaseImage });
      const state = imagesReducer(previousState, action);

      expect(state.entities['mock-id-1']?.image.caption).toBe('Updated Caption');
    });
  });

  describe('updateAlbumSucceeded', () => {
    it('should update existing images and add new images in an album', () => {
      const previousState: ImagesState = imagesAdapter.upsertMany(
        [
          {
            image: MOCK_IMAGES[0],
            formData: {
              id: MOCK_IMAGES[0].id,
              filename: MOCK_IMAGES[0].filename,
              caption: MOCK_IMAGES[0].caption,
              album: MOCK_IMAGES[0].album,
              albumCover: MOCK_IMAGES[0].albumCover,
              albumOrdinality: MOCK_IMAGES[0].albumOrdinality,
            },
          },
          {
            image: MOCK_IMAGES[1],
            formData: {
              id: MOCK_IMAGES[1].id,
              filename: MOCK_IMAGES[1].filename,
              caption: MOCK_IMAGES[1].caption,
              album: MOCK_IMAGES[1].album,
              albumCover: MOCK_IMAGES[1].albumCover,
              albumOrdinality: MOCK_IMAGES[1].albumOrdinality,
            },
          },
        ],
        initialState,
      );

      const updatedBaseImages: BaseImage[] = [
        { ...mockBaseImage, caption: 'Updated 1' },
        { ...pick(MOCK_IMAGES[1], BASE_IMAGE_PROPERTIES), caption: 'Updated 2' },
      ];

      const newImages = [MOCK_IMAGES[2]];

      const action = ImagesActions.updateAlbumSucceeded({
        album: 'Test Album',
        newImages,
        updatedImages: updatedBaseImages,
      });
      const state = imagesReducer(previousState, action);

      expect(state.entities['mock-id-1']?.image.caption).toBe('Updated 1');
      expect(state.entities['mock-id-2']?.image.caption).toBe('Updated 2');
      expect(state.entities['mock-id-3']?.image).toEqual(MOCK_IMAGES[2]);
      expect(state.ids).toContain('mock-id-3');
      expect(state.newImagesFormData).toEqual({});
    });

    it('should handle update with only updated images', () => {
      const previousState: ImagesState = imagesAdapter.upsertOne(
        {
          image: MOCK_IMAGES[0],
          formData: {
            id: MOCK_IMAGES[0].id,
            filename: MOCK_IMAGES[0].filename,
            caption: MOCK_IMAGES[0].caption,
            album: MOCK_IMAGES[0].album,
            albumCover: MOCK_IMAGES[0].albumCover,
            albumOrdinality: MOCK_IMAGES[0].albumOrdinality,
          },
        },
        initialState,
      );

      const action = ImagesActions.updateAlbumSucceeded({
        album: 'Test Album',
        newImages: [],
        updatedImages: [{ ...mockBaseImage, caption: 'Updated' }],
      });
      const state = imagesReducer(previousState, action);

      expect(state.entities['mock-id-1']?.image.caption).toBe('Updated');
      expect(state.ids.length).toBe(1);
    });

    it('should handle update with only new images', () => {
      const action = ImagesActions.updateAlbumSucceeded({
        album: 'Test Album',
        newImages: [MOCK_IMAGES[0], MOCK_IMAGES[1]],
        updatedImages: [],
      });
      const state = imagesReducer(initialState, action);

      expect(state.ids.length).toBe(2);
      expect(state.entities['mock-id-1']?.image).toEqual(MOCK_IMAGES[0]);
      expect(state.entities['mock-id-2']?.image).toEqual(MOCK_IMAGES[1]);
    });
  });

  describe('deleteImageSucceeded', () => {
    it('should remove image from state', () => {
      const previousState: ImagesState = imagesAdapter.upsertOne(
        {
          image: MOCK_IMAGES[0],
          formData: {
            id: MOCK_IMAGES[0].id,
            filename: MOCK_IMAGES[0].filename,
            caption: MOCK_IMAGES[0].caption,
            album: MOCK_IMAGES[0].album,
            albumCover: MOCK_IMAGES[0].albumCover,
            albumOrdinality: MOCK_IMAGES[0].albumOrdinality,
          },
        },
        initialState,
      );

      const action = ImagesActions.deleteImageSucceeded({ image: MOCK_IMAGES[0] });
      const state = imagesReducer(previousState, action);

      expect(state.entities['mock-id-1']).toBeUndefined();
      expect(state.ids.length).toBe(0);
    });

    it('should take the image off the page shown', () => {
      const previousState: ImagesState = {
        ...initialState,
        filteredImages: [MOCK_IMAGES[0], MOCK_IMAGES[1]],
      };
      const action = ImagesActions.deleteImageSucceeded({ image: MOCK_IMAGES[0] });

      const state = imagesReducer(previousState, action);

      expect(state.filteredImages).toEqual([MOCK_IMAGES[1]]);
    });
  });

  describe('deleteAlbumSucceeded', () => {
    it('should remove all images from an album', () => {
      const previousState: ImagesState = imagesAdapter.upsertMany(
        [
          {
            image: MOCK_IMAGES[0],
            formData: {
              id: MOCK_IMAGES[0].id,
              filename: MOCK_IMAGES[0].filename,
              caption: MOCK_IMAGES[0].caption,
              album: MOCK_IMAGES[0].album,
              albumCover: MOCK_IMAGES[0].albumCover,
              albumOrdinality: MOCK_IMAGES[0].albumOrdinality,
            },
          },
          {
            image: MOCK_IMAGES[1],
            formData: {
              id: MOCK_IMAGES[1].id,
              filename: MOCK_IMAGES[1].filename,
              caption: MOCK_IMAGES[1].caption,
              album: MOCK_IMAGES[1].album,
              albumCover: MOCK_IMAGES[1].albumCover,
              albumOrdinality: MOCK_IMAGES[1].albumOrdinality,
            },
          },
        ],
        initialState,
      );

      const action = ImagesActions.deleteAlbumSucceeded({
        album: 'Test Album',
        imageIds: ['mock-id-1', 'mock-id-2'],
      });
      const state = imagesReducer(previousState, action);

      expect(state.ids.length).toBe(0);
    });

    it('should take the album images off the page shown', () => {
      const previousState: ImagesState = {
        ...initialState,
        filteredImages: [MOCK_IMAGES[0], MOCK_IMAGES[1], MOCK_IMAGES[2]],
      };
      const action = ImagesActions.deleteAlbumSucceeded({
        album: 'Test Album',
        imageIds: [MOCK_IMAGES[0].id, MOCK_IMAGES[1].id],
      });

      const state = imagesReducer(previousState, action);

      expect(state.filteredImages).toEqual([MOCK_IMAGES[2]]);
    });
  });

  describe('formDataChanged', () => {
    it('should update newImagesFormData for new images', () => {
      const formData = [
        {
          id: 'new-1',
          caption: 'New Image Caption',
        },
      ];

      const action = ImagesActions.formDataChanged({ multipleFormData: formData });
      const state = imagesReducer(initialState, action);

      expect(state.newImagesFormData['new-1']?.caption).toBe('New Image Caption');
    });

    it('should update existing image formData', () => {
      const previousState: ImagesState = imagesAdapter.upsertOne(
        {
          image: MOCK_IMAGES[0],
          formData: {
            id: MOCK_IMAGES[0].id,
            filename: MOCK_IMAGES[0].filename,
            caption: MOCK_IMAGES[0].caption,
            album: MOCK_IMAGES[0].album,
            albumCover: MOCK_IMAGES[0].albumCover,
            albumOrdinality: MOCK_IMAGES[0].albumOrdinality,
          },
        },
        initialState,
      );

      const formData = [
        {
          id: 'mock-id-1',
          caption: 'Modified Caption',
        },
      ];

      const action = ImagesActions.formDataChanged({ multipleFormData: formData });
      const state = imagesReducer(previousState, action);

      expect(state.entities['mock-id-1']?.formData.caption).toBe('Modified Caption');
      expect(state.entities['mock-id-1']?.formData.album).toBe(MOCK_IMAGES[0].album);
    });

    it('should handle empty formData array', () => {
      const action = ImagesActions.formDataChanged({ multipleFormData: [] });
      const state = imagesReducer(initialState, action);

      expect(state).toBe(initialState);
    });
  });

  describe('imageFormDataRestored', () => {
    it('should reset newImagesFormData when imageId is null', () => {
      const previousState: ImagesState = {
        ...initialState,
        newImagesFormData: {
          'new-1': INITIAL_IMAGE_FORM_DATA,
        },
      };

      const action = ImagesActions.imageFormDataRestored({ imageId: null });
      const state = imagesReducer(previousState, action);

      expect(state.newImagesFormData).toEqual({});
    });

    it('should restore image formData from original image', () => {
      const previousState: ImagesState = imagesAdapter.upsertOne(
        {
          image: MOCK_IMAGES[0],
          formData: {
            id: MOCK_IMAGES[0].id,
            filename: MOCK_IMAGES[0].filename,
            caption: 'Modified Caption',
            album: 'Modified Album',
            albumCover: true,
            albumOrdinality: '99',
          },
        },
        initialState,
      );

      const action = ImagesActions.imageFormDataRestored({ imageId: 'mock-id-1' });
      const state = imagesReducer(previousState, action);

      expect(state.entities['mock-id-1']?.formData).toEqual({
        id: MOCK_IMAGES[0].id,
        filename: MOCK_IMAGES[0].filename,
        caption: MOCK_IMAGES[0].caption,
        album: MOCK_IMAGES[0].album,
        albumCover: MOCK_IMAGES[0].albumCover,
        albumOrdinality: MOCK_IMAGES[0].albumOrdinality,
      });
    });
  });

  describe('albumFormDataRestored', () => {
    it('should reset newImagesFormData when album is null', () => {
      const previousState: ImagesState = {
        ...initialState,
        newImagesFormData: {
          'new-1': INITIAL_IMAGE_FORM_DATA,
        },
      };

      const action = ImagesActions.albumFormDataRestored({ album: null });
      const state = imagesReducer(previousState, action);

      expect(state.newImagesFormData).toEqual({});
    });

    it('should restore formData for all images in an album', () => {
      const previousState: ImagesState = imagesAdapter.upsertMany(
        [
          {
            image: MOCK_IMAGES[0],
            formData: {
              id: MOCK_IMAGES[0].id,
              filename: MOCK_IMAGES[0].filename,
              caption: 'Modified Caption 1',
              album: MOCK_IMAGES[0].album,
              albumCover: MOCK_IMAGES[0].albumCover,
              albumOrdinality: MOCK_IMAGES[0].albumOrdinality,
            },
          },
          {
            image: MOCK_IMAGES[1],
            formData: {
              id: MOCK_IMAGES[1].id,
              filename: MOCK_IMAGES[1].filename,
              caption: 'Modified Caption 2',
              album: MOCK_IMAGES[1].album,
              albumCover: MOCK_IMAGES[1].albumCover,
              albumOrdinality: MOCK_IMAGES[1].albumOrdinality,
            },
          },
        ],
        initialState,
      );

      const action = ImagesActions.albumFormDataRestored({ album: MOCK_IMAGES[0].album });
      const state = imagesReducer(previousState, action);

      expect(state.entities['mock-id-1']?.formData.caption).toBe(MOCK_IMAGES[0].caption);
      // Only the first image should be restored since it matches the album
      expect(state.entities['mock-id-2']?.formData.caption).toBe('Modified Caption 2');
    });
  });

  describe('newImageRemoved', () => {
    it('should remove specific new image from formData', () => {
      const previousState: ImagesState = {
        ...initialState,
        newImagesFormData: {
          'new-1': INITIAL_IMAGE_FORM_DATA,
          'new-2': INITIAL_IMAGE_FORM_DATA,
        },
      };

      const action = ImagesActions.newImageRemoved({ imageId: 'new-1' });
      const state = imagesReducer(previousState, action);

      expect(state.newImagesFormData['new-1']).toBeUndefined();
      expect(state.newImagesFormData['new-2']).toBeDefined();
    });
  });

  describe('allNewImagesRemoved', () => {
    it('should clear all new images formData', () => {
      const previousState: ImagesState = {
        ...initialState,
        newImagesFormData: {
          'new-1': INITIAL_IMAGE_FORM_DATA,
          'new-2': INITIAL_IMAGE_FORM_DATA,
        },
      };

      const action = ImagesActions.allNewImagesRemoved();
      const state = imagesReducer(previousState, action);

      expect(state.newImagesFormData).toEqual({});
    });
  });

  describe('state immutability', () => {
    it('should not mutate the previous state', () => {
      const previousState: ImagesState = { ...initialState };
      const originalState = { ...previousState };

      const action = ImagesActions.fetchFilteredThumbnailsRequested();
      const state = imagesReducer(previousState, action);

      expect(previousState).toEqual(originalState);
      expect(state).not.toBe(previousState);
    });
  });
  describe('a fetch of filtered thumbnails', () => {
    it('should be marked as under way until it succeeds or fails', () => {
      const fetching = imagesReducer(
        initialState,
        ImagesActions.fetchFilteredThumbnailsRequested(),
      );

      expect(fetching.isFetchingFiltered).toBe(true);
      expect(
        imagesReducer(
          fetching,
          ImagesActions.fetchFilteredThumbnailsFailed({ error: mockError }),
        ).isFetchingFiltered,
      ).toBe(false);
    });
  });

  describe('merging presigned URLs', () => {
    const withMainImage = (urlExpirationDate: string): ImagesState =>
      imagesAdapter.upsertOne(
        {
          image: {
            ...MOCK_IMAGES[1],
            thumbnailUrl: undefined,
            urlExpirationDate,
          },
          formData: pick(MOCK_IMAGES[1], IMAGE_FORM_DATA_PROPERTIES),
        },
        initialState,
      );

    it.each([
      ['an earlier', '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'],
      ['a later', '2026-02-01T00:00:00.000Z', '2026-01-15T00:00:00.000Z'],
      ['no', undefined, '2026-01-15T00:00:00.000Z'],
    ])(
      'should keep the main URL and the earlier expiration when a thumbnail with %s expiration arrives',
      (_label, thumbnailExpiration, expectedExpiration) => {
        const previousState = withMainImage('2026-01-15T00:00:00.000Z');
        const thumbnail: Image = {
          ...MOCK_IMAGES[1],
          mainUrl: undefined,
          urlExpirationDate: thumbnailExpiration,
        };

        const filteredState = imagesReducer(
          previousState,
          ImagesActions.fetchFilteredThumbnailsSucceeded({
            images: [thumbnail],
            filteredCount: 1,
            totalCount: 1,
          }),
        );
        const batchState = imagesReducer(
          previousState,
          ImagesActions.fetchBatchThumbnailsSucceeded({
            images: [thumbnail],
            context: 'album-covers',
          }),
        );

        [filteredState, batchState].forEach(state => {
          const image = state.entities[MOCK_IMAGES[1].id]?.image;
          expect(image?.mainUrl).toBe(MOCK_IMAGES[1].mainUrl);
          expect(image?.thumbnailUrl).toBe(MOCK_IMAGES[1].thumbnailUrl);
          expect(image?.urlExpirationDate).toBe(expectedExpiration);
        });
      },
    );

    it('should keep the stored URLs of an added image the response leaves out', () => {
      const previousState = withMainImage('2026-01-15T00:00:00.000Z');

      const state = imagesReducer(
        previousState,
        ImagesActions.addImagesSucceeded({
          images: [
            {
              ...MOCK_IMAGES[1],
              mainUrl: undefined,
              thumbnailUrl: undefined,
              urlExpirationDate: undefined,
            },
          ],
        }),
      );

      const image = state.entities[MOCK_IMAGES[1].id]?.image;
      expect(image?.mainUrl).toBe(MOCK_IMAGES[1].mainUrl);
      expect(image?.thumbnailUrl).toBeUndefined();
      expect(image?.urlExpirationDate).toBe('2026-01-15T00:00:00.000Z');
    });
  });

  describe('changes to images that are not stored', () => {
    let consoleWarnSpy: MockInstance;

    beforeEach(() => {
      consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    });

    it('should skip an unknown image after an album update', () => {
      const state = imagesReducer(
        initialState,
        ImagesActions.updateAlbumSucceeded({
          album: 'Test Album',
          newImages: [MOCK_IMAGES[2]],
          updatedImages: [mockBaseImage],
        }),
      );

      expect(state.ids).toEqual([MOCK_IMAGES[2].id]);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining(mockBaseImage.id),
      );
    });

    it('should skip form data for an unknown image', () => {
      const state = imagesReducer(
        initialState,
        ImagesActions.formDataChanged({
          multipleFormData: [{ id: 'unknown-id', caption: 'Lost caption' }],
        }),
      );

      expect(state.ids).toEqual([]);
      expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('unknown-id'));
    });

    it('should only clear new image form data when restoring an album with no stored images', () => {
      const previousState: ImagesState = {
        ...initialState,
        newImagesFormData: { 'new-1': INITIAL_IMAGE_FORM_DATA },
      };

      const state = imagesReducer(
        previousState,
        ImagesActions.albumFormDataRestored({ album: 'Empty Album' }),
      );

      expect(state).toEqual({ ...previousState, newImagesFormData: {} });
    });
  });
});
