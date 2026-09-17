import { pick } from 'lodash';

import { BASE_IMAGE_PROPERTIES, INITIAL_IMAGE_FORM_DATA } from '@app/constants';
import { MOCK_IMAGES } from '@app/mocks/images.mock';
import { LccError } from '@app/models';
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

  describe('unknown action', () => {
    it('should return the default state', () => {
      const action = { type: 'Unknown' };
      const state = imagesReducer(initialState, action);

      expect(state).toBe(initialState);
    });
  });

  describe('initialState', () => {
    it('should have the correct initial state', () => {
      expect(initialState).toEqual({
        ids: [],
        entities: {},
        newImagesFormData: {},
        failedLoads: [],
        uploadProgress: null,
        filteredImages: [],
        filteredCount: null,
        totalCount: 0,
        options: {
          page: 1,
          pageSize: 20,
          sortBy: 'modificationInfo',
          sortOrder: 'desc',
          filters: null,
          search: '',
        },
        lastMetadataFetch: null,
        lastFilteredThumbnailsFetch: null,
        lastAlbumCoversFetch: null,
      });
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

    it('should forget a failure once its load is attempted again', () => {
      const previousState: ImagesState = {
        ...initialState,
        failedLoads: ['metadata', 'mainImage'],
      };

      const state = imagesReducer(
        previousState,
        ImagesActions.fetchMainImageRequested({ imageId: MOCK_IMAGES[0].id }),
      );

      expect(state.failedLoads).toEqual(['metadata']);
    });

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
      expect(state.lastMetadataFetch).toBeTruthy();
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
      expect(state.lastFilteredThumbnailsFetch).toBeTruthy();
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

      expect(state.lastAlbumCoversFetch).toBeTruthy();
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
});
