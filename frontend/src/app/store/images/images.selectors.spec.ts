import { INITIAL_IMAGE_FORM_DATA } from '@app/constants';
import { MOCK_ARTICLES } from '@app/mocks/articles.mock';
import { MOCK_IMAGES } from '@app/mocks/images.mock';
import {
  ArticleFormData,
  CallState,
  DataPaginationOptions,
  Image,
  ImageFormData,
} from '@app/models';

import { ImagesState, imagesAdapter } from './images.reducer';
import * as ImagesSelectors from './images.selectors';

describe('Images Selectors', () => {
  const mockCallState: CallState = {
    status: 'idle',
    error: null,
    loadStart: null,
  };

  const mockOptions: DataPaginationOptions<Image> = {
    page: 1,
    pageSize: 20,
    sortBy: 'filename',
    sortOrder: 'asc',
    filters: null,
    search: '',
  };

  const mockImageFormData: ImageFormData = {
    id: 'img-test',
    filename: 'test.jpg',
    caption: 'Test Caption',
    album: 'Test Album',
    albumCover: false,
    albumOrdinality: '1',
  };

  const mockImagesState: ImagesState = {
    ...imagesAdapter.getInitialState({
      callState: mockCallState,
      newImagesFormData: {},
      lastMetadataFetch: '2025-01-15T10:00:00.000Z',
      lastFilteredThumbnailsFetch: '2025-01-14T12:00:00.000Z',
      lastAlbumCoversFetch: '2025-01-13T14:00:00.000Z',
      filteredImages: [MOCK_IMAGES[0], MOCK_IMAGES[1]],
      options: mockOptions,
      filteredCount: 10,
      totalCount: 50,
    }),
    entities: {
      [MOCK_IMAGES[0].id]: {
        image: MOCK_IMAGES[0],
        formData: mockImageFormData,
      },
      [MOCK_IMAGES[1].id]: {
        image: MOCK_IMAGES[1],
        formData: INITIAL_IMAGE_FORM_DATA,
      },
    },
    ids: [MOCK_IMAGES[0].id, MOCK_IMAGES[1].id],
  };

  describe('selectAllImages', () => {
    it('should select all images from entities', () => {
      const allImageEntities = [
        { image: MOCK_IMAGES[0], formData: mockImageFormData },
        { image: MOCK_IMAGES[1], formData: INITIAL_IMAGE_FORM_DATA },
      ];
      const result = ImagesSelectors.selectAllImages.projector(allImageEntities);
      expect(result).toEqual([MOCK_IMAGES[0], MOCK_IMAGES[1]]);
    });
  });

  describe('selectCallState', () => {
    it('should select the call state', () => {
      const result = ImagesSelectors.selectCallState.projector(mockImagesState);
      expect(result).toEqual(mockCallState);
    });
  });

  describe('selectNewImagesFormData', () => {
    it('should select the new images form data', () => {
      const result = ImagesSelectors.selectNewImagesFormData.projector(mockImagesState);
      expect(result).toEqual({});
    });
  });

  describe('selectLastMetadataFetch', () => {
    it('should select the last metadata fetch timestamp', () => {
      const result = ImagesSelectors.selectLastMetadataFetch.projector(mockImagesState);
      expect(result).toBe('2025-01-15T10:00:00.000Z');
    });
  });

  describe('selectLastFilteredThumbnailsFetch', () => {
    it('should select the last filtered thumbnails fetch timestamp', () => {
      const result =
        ImagesSelectors.selectLastFilteredThumbnailsFetch.projector(mockImagesState);
      expect(result).toBe('2025-01-14T12:00:00.000Z');
    });
  });

  describe('selectLastAlbumCoversFetch', () => {
    it('should select the last album covers fetch timestamp', () => {
      const result =
        ImagesSelectors.selectLastAlbumCoversFetch.projector(mockImagesState);
      expect(result).toBe('2025-01-13T14:00:00.000Z');
    });
  });

  describe('selectFilteredImages', () => {
    it('should select the filtered images', () => {
      const result = ImagesSelectors.selectFilteredImages.projector(mockImagesState);
      expect(result).toEqual([MOCK_IMAGES[0], MOCK_IMAGES[1]]);
    });
  });

  describe('selectOptions', () => {
    it('should select the data pagination options', () => {
      const result = ImagesSelectors.selectOptions.projector(mockImagesState);
      expect(result).toEqual(mockOptions);
    });
  });

  describe('selectFilteredCount', () => {
    it('should select the filtered count', () => {
      const result = ImagesSelectors.selectFilteredCount.projector(mockImagesState);
      expect(result).toBe(10);
    });
  });

  describe('selectTotalCount', () => {
    it('should select the total count', () => {
      const result = ImagesSelectors.selectTotalCount.projector(mockImagesState);
      expect(result).toBe(50);
    });
  });

  describe('selectNewImageFormData', () => {
    it('should return null when newImagesFormData is empty', () => {
      const newImagesFormData = {};
      const result = ImagesSelectors.selectNewImageFormData.projector(newImagesFormData);
      expect(result).toBeNull();
    });

    it('should return form data when single image', () => {
      const newImagesFormData = {
        'img-1': mockImageFormData,
      };
      const result = ImagesSelectors.selectNewImageFormData.projector(newImagesFormData);
      expect(result).toEqual(mockImageFormData);
    });

    it('should log warning and return null when multiple images', () => {
      const consoleWarnSpy = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => undefined);
      const newImagesFormData = {
        'img-1': mockImageFormData,
        'img-2': mockImageFormData,
      };
      const result = ImagesSelectors.selectNewImageFormData.projector(newImagesFormData);
      expect(result).toBeNull();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[LCC] Image data for multiple images found while selecting new image form data',
      );
      consoleWarnSpy.mockRestore();
    });
  });

  describe('selectImageEntitiesByAlbum', () => {
    it('should filter entities by album', () => {
      const allImageEntities = [
        { image: { ...MOCK_IMAGES[0], album: 'Album A' }, formData: mockImageFormData },
        { image: { ...MOCK_IMAGES[1], album: 'Album B' }, formData: mockImageFormData },
        { image: { ...MOCK_IMAGES[2], album: 'Album A' }, formData: mockImageFormData },
      ];
      const selector = ImagesSelectors.selectImageEntitiesByAlbum('Album A');
      const result = selector.projector(allImageEntities);
      expect(result).toHaveLength(2);
      expect(result[0].image.album).toBe('Album A');
      expect(result[1].image.album).toBe('Album A');
    });

    it('should return empty array when album is null', () => {
      const allImageEntities = [{ image: MOCK_IMAGES[0], formData: mockImageFormData }];
      const selector = ImagesSelectors.selectImageEntitiesByAlbum(null);
      const result = selector.projector(allImageEntities);
      expect(result).toEqual([]);
    });
  });

  describe('selectImagesByAlbum', () => {
    it('should filter images by album', () => {
      const allImages = [
        { ...MOCK_IMAGES[0], album: 'Album A' },
        { ...MOCK_IMAGES[1], album: 'Album B' },
        { ...MOCK_IMAGES[2], album: 'Album A' },
      ];
      const selector = ImagesSelectors.selectImagesByAlbum('Album A');
      const result = selector.projector(allImages);
      expect(result).toHaveLength(2);
      expect(result[0].album).toBe('Album A');
      expect(result[1].album).toBe('Album A');
    });

    it('should return empty array when album is null', () => {
      const allImages = [MOCK_IMAGES[0]];
      const selector = ImagesSelectors.selectImagesByAlbum(null);
      const result = selector.projector(allImages);
      expect(result).toEqual([]);
    });
  });

  describe('selectPhotoImages', () => {
    it('should filter out images with underscore-prefixed albums', () => {
      const allImages = [
        { ...MOCK_IMAGES[0], album: 'Regular Album' },
        { ...MOCK_IMAGES[1], album: '_System Album' },
        { ...MOCK_IMAGES[2], album: 'Another Album' },
        { ...MOCK_IMAGES[3], album: '_Hidden' },
      ];
      const result = ImagesSelectors.selectPhotoImages.projector(allImages);
      expect(result).toHaveLength(2);
      expect(result[0].album).toBe('Regular Album');
      expect(result[1].album).toBe('Another Album');
    });
  });

  describe('selectImageEntityById', () => {
    it('should select image entity by id', () => {
      const allImageEntities = [
        { image: MOCK_IMAGES[0], formData: mockImageFormData },
        { image: MOCK_IMAGES[1], formData: INITIAL_IMAGE_FORM_DATA },
      ];
      const selector = ImagesSelectors.selectImageEntityById(MOCK_IMAGES[0].id);
      const result = selector.projector(allImageEntities);
      expect(result).toEqual({ image: MOCK_IMAGES[0], formData: mockImageFormData });
    });

    it('should return null when id not found', () => {
      const allImageEntities = [{ image: MOCK_IMAGES[0], formData: mockImageFormData }];
      const selector = ImagesSelectors.selectImageEntityById('non-existent-id');
      const result = selector.projector(allImageEntities);
      expect(result).toBeNull();
    });
  });

  describe('selectImageById', () => {
    it('should select image by id', () => {
      const allImages = [MOCK_IMAGES[0], MOCK_IMAGES[1]];
      const selector = ImagesSelectors.selectImageById(MOCK_IMAGES[0].id);
      const result = selector.projector(allImages);
      expect(result).toEqual(MOCK_IMAGES[0]);
    });

    it('should return null when id not found', () => {
      const allImages = [MOCK_IMAGES[0]];
      const selector = ImagesSelectors.selectImageById('non-existent-id');
      const result = selector.projector(allImages);
      expect(result).toBeNull();
    });
  });

  describe('selectImagesByIds', () => {
    it('should select multiple images by ids', () => {
      const allImages = [MOCK_IMAGES[0], MOCK_IMAGES[1], MOCK_IMAGES[2]];
      const selector = ImagesSelectors.selectImagesByIds([
        MOCK_IMAGES[0].id,
        MOCK_IMAGES[2].id,
      ]);
      const result = selector.projector(allImages);
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe(MOCK_IMAGES[0].id);
      expect(result[1].id).toBe(MOCK_IMAGES[2].id);
    });

    it('should return empty array when no ids match', () => {
      const allImages = [MOCK_IMAGES[0]];
      const selector = ImagesSelectors.selectImagesByIds([
        'non-existent-1',
        'non-existent-2',
      ]);
      const result = selector.projector(allImages);
      expect(result).toEqual([]);
    });
  });

  describe('selectImageHasUnsavedChanges', () => {
    it('should return false for existing image with no changes', () => {
      const image = MOCK_IMAGES[0];
      const entity = {
        image,
        formData: {
          id: image.id,
          filename: image.filename,
          caption: image.caption,
          album: image.album,
          albumCover: image.albumCover,
          albumOrdinality: image.albumOrdinality,
        },
      };
      const selector = ImagesSelectors.selectImageHasUnsavedChanges(MOCK_IMAGES[0].id);
      const result = selector.projector(entity, null);
      expect(result).toBe(false);
    });

    it('should return true for existing image with changes', () => {
      const image = { ...MOCK_IMAGES[0], caption: 'Original' };
      const entity = {
        image,
        formData: {
          id: image.id,
          filename: image.filename,
          caption: 'Modified',
          album: 'Album',
          albumCover: false,
          albumOrdinality: '1',
        },
      };
      const selector = ImagesSelectors.selectImageHasUnsavedChanges(MOCK_IMAGES[0].id);
      const result = selector.projector(entity, null);
      expect(result).toBe(true);
    });

    it('should return false for new image with initial form data', () => {
      const newImageFormData = INITIAL_IMAGE_FORM_DATA;
      const selector = ImagesSelectors.selectImageHasUnsavedChanges(null);
      const result = selector.projector(null, newImageFormData);
      expect(result).toBe(false);
    });

    it('should return true for new image with modified form data', () => {
      const newImageFormData = { ...INITIAL_IMAGE_FORM_DATA, caption: 'New Caption' };
      const selector = ImagesSelectors.selectImageHasUnsavedChanges(null);
      const result = selector.projector(null, newImageFormData);
      expect(result).toBe(true);
    });
  });

  describe('selectAlbumHasUnsavedChanges', () => {
    it('should return true when new images form data exists', () => {
      const newImagesFormData = { 'img-1': mockImageFormData };
      const selector = ImagesSelectors.selectAlbumHasUnsavedChanges('Album A');
      const result = selector.projector([], newImagesFormData);
      expect(result).toBe(true);
    });

    it('should return false when album is null', () => {
      const selector = ImagesSelectors.selectAlbumHasUnsavedChanges(null);
      const result = selector.projector([], {});
      expect(result).toBe(false);
    });

    it('should return false when no changes in album entities', () => {
      const image = { ...MOCK_IMAGES[0], album: 'Album A' };
      const entities = [
        {
          image,
          formData: {
            id: image.id,
            filename: image.filename,
            caption: image.caption,
            album: image.album,
            albumCover: image.albumCover,
            albumOrdinality: image.albumOrdinality,
          },
        },
      ];
      const selector = ImagesSelectors.selectAlbumHasUnsavedChanges('Album A');
      const result = selector.projector(entities, {});
      expect(result).toBe(false);
    });

    it('should return true when changes exist in album entities', () => {
      const image = { ...MOCK_IMAGES[0], caption: 'Original' };
      const entities = [
        {
          image,
          formData: {
            id: image.id,
            filename: image.filename,
            caption: 'Modified',
            album: 'Album A',
            albumCover: false,
            albumOrdinality: '1',
          },
        },
      ];
      const selector = ImagesSelectors.selectAlbumHasUnsavedChanges('Album A');
      const result = selector.projector(entities, {});
      expect(result).toBe(true);
    });
  });

  describe('selectAlbumCoverImageIds', () => {
    it('should select ids of images marked as album covers', () => {
      const allImages = [
        { ...MOCK_IMAGES[0], albumCover: true },
        { ...MOCK_IMAGES[1], albumCover: false },
        { ...MOCK_IMAGES[2], albumCover: true },
      ];
      const result = ImagesSelectors.selectAlbumCoverImageIds.projector(allImages);
      expect(result).toEqual([MOCK_IMAGES[0].id, MOCK_IMAGES[2].id]);
    });
  });

  describe('selectAllExistingAlbums', () => {
    it('should return unique album names', () => {
      const allImages = [
        { ...MOCK_IMAGES[0], album: 'Album A' },
        { ...MOCK_IMAGES[1], album: 'Album B' },
        { ...MOCK_IMAGES[2], album: 'Album A' },
        { ...MOCK_IMAGES[3], album: 'Album C' },
      ];
      const result = ImagesSelectors.selectAllExistingAlbums.projector(allImages);
      expect(result).toEqual(['Album A', 'Album B', 'Album C']);
    });
  });

  describe('selectArticleImages', () => {
    it('should filter images with article appearances', () => {
      const allImages = [
        { ...MOCK_IMAGES[0], articleAppearances: 2 },
        { ...MOCK_IMAGES[1], articleAppearances: 0 },
        { ...MOCK_IMAGES[2], articleAppearances: 1 },
        { ...MOCK_IMAGES[3] },
      ];
      const result = ImagesSelectors.selectArticleImages.projector(allImages);
      expect(result).toHaveLength(2);
      expect(result[0].articleAppearances).toBe(2);
      expect(result[1].articleAppearances).toBe(1);
    });
  });

  describe('selectIdsOfArticleBannerImagesWithMissingOrExpiredThumbnailUrls', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      // Set current time to November 15, 2025, 12:00:00 UTC
      vi.setSystemTime(new Date('2025-11-15T12:00:00Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should return sorted unique ids of banner images without thumbnail URLs', () => {
      const articles = [
        { ...MOCK_ARTICLES[0], bannerImageId: 'img-1' },
        { ...MOCK_ARTICLES[1], bannerImageId: 'img-2' },
        { ...MOCK_ARTICLES[2], bannerImageId: 'img-1' },
      ];
      const allImages = [
        { ...MOCK_IMAGES[0], id: 'img-1', thumbnailUrl: undefined },
        {
          ...MOCK_IMAGES[1],
          id: 'img-2',
          thumbnailUrl: 'https://example.com/thumb.jpg',
          urlExpirationDate: '2025-11-15T22:00:00Z',
        },
      ];
      const selector =
        ImagesSelectors.selectIdsOfArticleBannerImagesWithMissingOrExpiredThumbnailUrls(
          articles,
        );
      const result = selector.projector(allImages);
      expect(result).toEqual(['img-1']);
    });

    it('should return ids of banner images whose presigned URLs are within the 2h safety buffer', () => {
      const articles = [
        { ...MOCK_ARTICLES[0], bannerImageId: 'img-1' },
        { ...MOCK_ARTICLES[1], bannerImageId: 'img-2' },
        { ...MOCK_ARTICLES[2], bannerImageId: 'img-3' },
      ];
      // img-1: urlExpirationDate 1 hour from now (inside 2h buffer -> refresh)
      // img-2: urlExpirationDate 6 hours from now (outside buffer -> keep)
      // img-3: urlExpirationDate already in the past (-> refresh)
      const allImages = [
        {
          ...MOCK_IMAGES[0],
          id: 'img-1',
          thumbnailUrl: 'https://example.com/thumb-1.jpg',
          urlExpirationDate: '2025-11-15T13:00:00Z',
        },
        {
          ...MOCK_IMAGES[1],
          id: 'img-2',
          thumbnailUrl: 'https://example.com/thumb-2.jpg',
          urlExpirationDate: '2025-11-15T18:00:00Z',
        },
        {
          ...MOCK_IMAGES[2],
          id: 'img-3',
          thumbnailUrl: 'https://example.com/thumb-3.jpg',
          urlExpirationDate: '2025-11-15T11:00:00Z',
        },
      ];
      const selector =
        ImagesSelectors.selectIdsOfArticleBannerImagesWithMissingOrExpiredThumbnailUrls(
          articles,
        );
      const result = selector.projector(allImages);
      expect(result).toEqual(['img-1', 'img-3']);
    });

    it('should return both missing and expired thumbnail URLs', () => {
      const articles = [
        { ...MOCK_ARTICLES[0], bannerImageId: 'img-1' },
        { ...MOCK_ARTICLES[1], bannerImageId: 'img-2' },
        { ...MOCK_ARTICLES[2], bannerImageId: 'img-3' },
      ];
      const allImages = [
        { ...MOCK_IMAGES[0], id: 'img-1', thumbnailUrl: undefined },
        {
          ...MOCK_IMAGES[1],
          id: 'img-2',
          thumbnailUrl: 'https://example.com/thumb-2.jpg',
          urlExpirationDate: '2025-11-15T11:00:00Z',
        },
        {
          ...MOCK_IMAGES[2],
          id: 'img-3',
          thumbnailUrl: 'https://example.com/valid.jpg',
          urlExpirationDate: '2025-11-15T22:00:00Z',
        },
      ];
      const selector =
        ImagesSelectors.selectIdsOfArticleBannerImagesWithMissingOrExpiredThumbnailUrls(
          articles,
        );
      const result = selector.projector(allImages);
      expect(result).toEqual(['img-1', 'img-2']);
    });
  });

  describe('selectBannerImageByArticleId', () => {
    it('should select image by article form data bannerImageId', () => {
      const allImages = [MOCK_IMAGES[0], MOCK_IMAGES[1]];
      const article = MOCK_ARTICLES[0];
      const articleFormData: ArticleFormData = {
        title: article.title,
        body: article.body,
        bannerImageId: MOCK_IMAGES[1].id,
      };
      const selector = ImagesSelectors.selectBannerImageByArticleId(article.id);
      const result = selector.projector(allImages, article, articleFormData);
      expect(result).toEqual(MOCK_IMAGES[1]);
    });

    it('should select image by article bannerImageId when form data has no bannerImageId', () => {
      const allImages = [MOCK_IMAGES[0], MOCK_IMAGES[1]];
      const article = { ...MOCK_ARTICLES[0], bannerImageId: MOCK_IMAGES[0].id };
      const articleFormData: ArticleFormData = {
        title: article.title,
        body: article.body,
        bannerImageId: '',
      };
      const selector = ImagesSelectors.selectBannerImageByArticleId(article.id);
      const result = selector.projector(allImages, article, articleFormData);
      expect(result).toEqual(MOCK_IMAGES[0]);
    });

    it('should return null when image not found', () => {
      const allImages = [MOCK_IMAGES[0]];
      const article = MOCK_ARTICLES[0];
      const articleFormData: ArticleFormData = {
        title: article.title,
        body: article.body,
        bannerImageId: 'non-existent-id',
      };
      const selector = ImagesSelectors.selectBannerImageByArticleId(article.id);
      const result = selector.projector(allImages, article, articleFormData);
      expect(result).toBeNull();
    });
  });
});
