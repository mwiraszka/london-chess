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
        callState: {
          status: 'idle',
          error: null,
          loadStart: null,
        },
        newImagesFormData: {},
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

  describe('loading states', () => {
    it('should set loading state on fetchFilteredThumbnailsRequested', () => {
      const action = ImagesActions.fetchFilteredThumbnailsRequested();
      const state = imagesReducer(initialState, action);

      expect(state.callState.status).toBe('loading');
      expect(state.callState.loadStart).toBeTruthy();
      expect(state.callState.error).toBeNull();
    });

    it('should set loading state on fetchMainImageRequested', () => {
      const action = ImagesActions.fetchMainImageRequested({ imageId: 'mock-id-1' });
      const state = imagesReducer(initialState, action);

      expect(state.callState.status).toBe('loading');
    });

    it('should set loading state on addImageRequested', () => {
      const action = ImagesActions.addImageRequested({ imageId: 'new-1' });
      const state = imagesReducer(initialState, action);

      expect(state.callState.status).toBe('loading');
    });

    it('should set loading state on addImagesRequested', () => {
      const action = ImagesActions.addImagesRequested();
      const state = imagesReducer(initialState, action);

      expect(state.callState.status).toBe('loading');
    });

    it('should set loading state on updateImageRequested', () => {
      const action = ImagesActions.updateImageRequested({ imageId: 'mock-id-1' });
      const state = imagesReducer(initialState, action);

      expect(state.callState.status).toBe('loading');
    });

    it('should set loading state on updateAlbumRequested', () => {
      const action = ImagesActions.updateAlbumRequested({ album: 'Test Album' });
      const state = imagesReducer(initialState, action);

      expect(state.callState.status).toBe('loading');
    });

    it('should set loading state on deleteImageRequested', () => {
      const action = ImagesActions.deleteImageRequested({ image: MOCK_IMAGES[0] });
      const state = imagesReducer(initialState, action);

      expect(state.callState.status).toBe('loading');
    });

    it('should set loading state on deleteAlbumRequested', () => {
      const action = ImagesActions.deleteAlbumRequested({ album: 'Test Album' });
      const state = imagesReducer(initialState, action);

      expect(state.callState.status).toBe('loading');
    });
  });

  describe('background loading states', () => {
    it('should set background-loading state on fetchAllImagesMetadataRequested', () => {
      const action = ImagesActions.fetchAllImagesMetadataRequested();
      const state = imagesReducer(initialState, action);

      expect(state.callState.status).toBe('background-loading');
      expect(state.callState.loadStart).toBeTruthy();
    });

    it('should set background-loading state on fetchBatchThumbnailsRequested', () => {
      const action = ImagesActions.fetchBatchThumbnailsRequested({
        imageIds: ['mock-id-1', 'mock-id-2'],
        context: 'album-covers',
      });
      const state = imagesReducer(initialState, action);

      expect(state.callState.status).toBe('background-loading');
    });
  });

  describe('error states', () => {
    it('should set error state on fetchAllImagesMetadataFailed', () => {
      const action = ImagesActions.fetchAllImagesMetadataFailed({ error: mockError });
      const state = imagesReducer(initialState, action);

      expect(state.callState.status).toBe('error');
      expect(state.callState.error).toEqual(mockError);
      expect(state.callState.loadStart).toBeNull();
    });

    it('should set error state on fetchFilteredThumbnailsFailed', () => {
      const action = ImagesActions.fetchFilteredThumbnailsFailed({ error: mockError });
      const state = imagesReducer(initialState, action);

      expect(state.callState.status).toBe('error');
    });

    it('should set error state on fetchMainImageFailed', () => {
      const action = ImagesActions.fetchMainImageFailed({ error: mockError });
      const state = imagesReducer(initialState, action);

      expect(state.callState.status).toBe('error');
    });

    it('should set error state on addImageFailed', () => {
      const action = ImagesActions.addImageFailed({ error: mockError });
      const state = imagesReducer(initialState, action);

      expect(state.callState.status).toBe('error');
    });

    it('should set error state on updateImageFailed', () => {
      const action = ImagesActions.updateImageFailed({
        baseImage: mockBaseImage,
        error: mockError,
      });
      const state = imagesReducer(initialState, action);

      expect(state.callState.status).toBe('error');
    });

    it('should set error state on deleteImageFailed', () => {
      const action = ImagesActions.deleteImageFailed({
        image: MOCK_IMAGES[0],
        error: mockError,
      });
      const state = imagesReducer(initialState, action);

      expect(state.callState.status).toBe('error');
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

    it('should reset callState', () => {
      const action = ImagesActions.fetchFilteredThumbnailsSucceeded({
        images: [],
        filteredCount: 0,
        totalCount: 0,
      });
      const state = imagesReducer(initialState, action);

      expect(state.callState.status).toBe('idle');
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

    it('should reset lastFilteredThumbnailsFetch', () => {
      const previousState: ImagesState = {
        ...initialState,
        lastFilteredThumbnailsFetch: '2025-01-01T00:00:00.000Z',
      };

      const action = ImagesActions.paginationOptionsChanged({
        options: { ...initialState.options, page: 2 },
        fetch: false,
      });
      const state = imagesReducer(previousState, action);

      expect(state.lastFilteredThumbnailsFetch).toBeNull();
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
      expect(state.callState.status).toBe('idle');
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

  describe('fetchMainImageInBackgroundFailed', () => {
    it('should reset the call state without recording an error', () => {
      const loadingState = {
        ...initialState,
        callState: {
          status: 'loading' as const,
          loadStart: new Date().toISOString(),
          error: null,
        },
      };

      const action = ImagesActions.fetchMainImageInBackgroundFailed({
        error: { name: 'LCCError', message: 'Background fetch failed.' },
      });
      const state = imagesReducer(loadingState, action);

      expect(state.callState).toEqual(initialState.callState);
    });
  });

  describe('addImageSucceeded', () => {
    it('should add new image to state', () => {
      const action = ImagesActions.addImageSucceeded({ image: MOCK_IMAGES[0] });
      const state = imagesReducer(initialState, action);

      expect(state.entities['mock-id-1']?.image).toEqual(MOCK_IMAGES[0]);
      expect(state.callState.status).toBe('idle');
    });

    it('should reset newImagesFormData and timestamps', () => {
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
      expect(state.lastFilteredThumbnailsFetch).toBeNull();
      expect(state.lastAlbumCoversFetch).toBeNull();
      expect(state.lastMetadataFetch).toBeNull();
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
      expect(state.callState.status).toBe('idle');
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
      expect(state.callState.status).toBe('idle');
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
      expect(state.callState.status).toBe('idle');
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

  describe('requestTimedOut', () => {
    it('should set timeout error', () => {
      const action = ImagesActions.requestTimedOut();
      const state = imagesReducer(initialState, action);

      expect(state.callState.status).toBe('error');
      expect(state.callState.error).toEqual({
        name: 'LCCError',
        message: 'Request timed out',
      });
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
