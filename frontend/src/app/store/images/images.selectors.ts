import { createFeatureSelector, createSelector } from '@ngrx/store';
import { omit, pick, uniq } from 'lodash';

import { INITIAL_IMAGE_FORM_DATA } from '@app/constants';
import { Article, Id } from '@app/models';
import * as ArticlesSelectors from '@app/store/articles/articles.selectors';
import { areSame, isPresignedUrlExpired, loadStatus } from '@app/utils';

import { ImagesState, imagesAdapter } from './images.reducer';

const selectImagesState = createFeatureSelector<ImagesState>('imagesState');

const { selectAll: selectAllImageEntities } =
  imagesAdapter.getSelectors(selectImagesState);

export const selectAllImages = createSelector(
  selectAllImageEntities,
  allImageEntities => {
    return allImageEntities.map(entity => entity.image);
  },
);

const selectFailedLoads = createSelector(selectImagesState, state => state.failedLoads);

export const selectUploadProgress = createSelector(
  selectImagesState,
  state => state.uploadProgress,
);

export const selectNewImagesFormData = createSelector(selectImagesState, state => {
  return state.newImagesFormData;
});

export const selectLastMetadataFetch = createSelector(selectImagesState, state => {
  return state.lastMetadataFetch;
});

export const selectLastFilteredThumbnailsFetch = createSelector(
  selectImagesState,
  state => {
    return state.lastFilteredThumbnailsFetch;
  },
);

export const selectLastAlbumCoversFetch = createSelector(selectImagesState, state => {
  return state.lastAlbumCoversFetch;
});

export const selectMetadataStatus = createSelector(
  selectLastMetadataFetch,
  selectFailedLoads,
  (lastFetch, failedLoads) =>
    loadStatus(lastFetch !== null, failedLoads.includes('metadata')),
);

export const selectFilteredThumbnailsStatus = createSelector(
  selectLastFilteredThumbnailsFetch,
  selectFailedLoads,
  (lastFetch, failedLoads) =>
    loadStatus(lastFetch !== null, failedLoads.includes('filteredThumbnails')),
);

export const selectFilteredImages = createSelector(selectImagesState, state => {
  return state.filteredImages;
});

export const selectOptions = createSelector(selectImagesState, state => {
  return state.options;
});

export const selectFilteredCount = createSelector(selectImagesState, state => {
  return state.filteredCount;
});

export const selectTotalCount = createSelector(selectImagesState, state => {
  return state.totalCount;
});

export const selectNewImageFormData = createSelector(
  selectNewImagesFormData,
  newImagesFormData => {
    if (Object.keys(newImagesFormData).length > 1) {
      console.warn(
        '[LCC] Image data for multiple images found while selecting new image form data',
      );
      return null;
    }

    return Object.keys(newImagesFormData).length === 1
      ? Object.values(newImagesFormData)[0]
      : null;
  },
);

export const selectImageEntitiesByAlbum = (album: string | null) =>
  createSelector(selectAllImageEntities, allImageEntities =>
    album ? allImageEntities.filter(entity => entity.image.album === album) : [],
  );

export const selectImagesByAlbum = (album: string | null) =>
  createSelector(selectAllImages, allImages =>
    album ? allImages.filter(image => image.album === album) : [],
  );

export const selectPhotoImages = createSelector(selectAllImages, allImages =>
  allImages.filter(image => !image.album.startsWith('_')),
);

export const selectImageEntityById = (id: Id | null) =>
  createSelector(
    selectAllImageEntities,
    allImageEntities => allImageEntities.find(entity => entity.image.id === id) ?? null,
  );

export const selectImageStatus = (id: Id | null) =>
  createSelector(selectImageEntityById(id), selectFailedLoads, (entity, failedLoads) =>
    loadStatus(!!entity, failedLoads.includes('mainImage')),
  );

export const selectImageById = (id: Id) =>
  createSelector(
    selectAllImages,
    allImages => allImages.find(image => image.id === id) ?? null,
  );

export const selectImagesByIds = (ids: Id[]) =>
  createSelector(selectAllImages, allImages =>
    allImages.filter(image => ids.find(id => id === image.id)),
  );

export const selectImageHasUnsavedChanges = (id: Id | null) =>
  createSelector(
    selectImageEntityById(id),
    selectNewImageFormData,
    (entity, newImageFormData) => {
      if (!id) {
        return (
          !!newImageFormData &&
          !areSame(omit(newImageFormData, 'id'), omit(INITIAL_IMAGE_FORM_DATA, 'id'))
        );
      }

      return (
        !!entity &&
        !areSame(
          pick(entity.image, Object.getOwnPropertyNames(entity.formData)),
          entity.formData,
        )
      );
    },
  );

export const selectAlbumHasUnsavedChanges = (album: string | null) =>
  createSelector(
    selectImageEntitiesByAlbum(album),
    selectNewImagesFormData,
    (entities, newImagesFormData) => {
      if (Object.keys(newImagesFormData).length > 0) {
        return true;
      }

      if (!album) {
        return false;
      }

      return (
        !!entities.length &&
        entities.some(
          entity =>
            !areSame(
              pick(entity.image, Object.getOwnPropertyNames(entity.formData)),
              entity.formData,
            ),
        )
      );
    },
  );

export const selectAlbumCoverImageIds = createSelector(selectAllImages, allImages => {
  return allImages.filter(image => image.albumCover).map(image => image.id);
});

export const selectIdsOfAlbumCoversWithMissingOrExpiredThumbnailUrls = createSelector(
  selectAllImages,
  allImages => {
    return allImages
      .filter(image => {
        if (!image.albumCover) {
          return false;
        }
        // Include album covers with missing or expired thumbnail URLs
        return !image.thumbnailUrl || isPresignedUrlExpired(image.urlExpirationDate);
      })
      .map(image => image.id);
  },
);

export const selectAllExistingAlbums = createSelector(selectAllImages, allImages => {
  return uniq(allImages.map(image => image.album));
});

export const selectArticleImages = createSelector(selectAllImages, allImages => {
  return allImages.filter(image => (image?.articleAppearances ?? 0) > 0);
});

export const selectIdsOfArticleBannerImagesWithMissingOrExpiredThumbnailUrls = (
  articles: Article[],
) =>
  createSelector(selectAllImages, allImages => {
    return uniq(
      articles
        .map(article => article.bannerImageId)
        .filter(bannerImageId => {
          const image = allImages.find(img => img.id === bannerImageId);
          return !image?.thumbnailUrl || isPresignedUrlExpired(image.urlExpirationDate);
        }),
    ).sort();
  });

export const selectBannerImageByArticleId = (articleId: Id | null) =>
  createSelector(
    selectAllImages,
    ArticlesSelectors.selectArticleById(articleId),
    ArticlesSelectors.selectArticleFormDataById(articleId),
    (allImages, article, articleFormData) => {
      const imageId = articleFormData.bannerImageId || article?.bannerImageId;
      return allImages?.find(image => image?.id === imageId) ?? null;
    },
  );

export const selectBodyImagesByArticleId = (articleId: Id | null) =>
  createSelector(
    selectAllImages,
    ArticlesSelectors.selectArticleById(articleId),
    ArticlesSelectors.selectArticleFormDataById(articleId),
    (allImages, article, articleFormData) => {
      const body = articleFormData.body || article?.body || '';

      // Find all {{{...}}} patterns in the body
      const imagePattern = /{{{([^}]+)}}}/g;
      const imageIds: Id[] = [];
      let match: RegExpExecArray | null;

      while ((match = imagePattern.exec(body)) !== null) {
        const content = match[1];
        const idMatch = content.match(/[a-f\d]{24}/);
        if (idMatch) {
          imageIds.push(idMatch[0]);
        }
      }

      // Remove duplicates and return corresponding images
      const uniqueIds = uniq(imageIds);
      return allImages.filter(image => uniqueIds.includes(image.id));
    },
  );

export const selectImageIdsByArticleId = (articleId: Id | null) =>
  createSelector(
    ArticlesSelectors.selectArticleById(articleId),
    ArticlesSelectors.selectArticleFormDataById(articleId),
    (article, articleFormData) => {
      const body = articleFormData.body || article?.body || '';
      const bannerImageId = articleFormData.bannerImageId || article?.bannerImageId;

      const imagePattern = /{{{([^}]+)}}}/g;
      const imageIds: Id[] = [];

      if (bannerImageId) {
        imageIds.push(bannerImageId);
      }

      let match: RegExpExecArray | null;
      while ((match = imagePattern.exec(body)) !== null) {
        const content = match[1];
        const idMatch = content.match(/[a-f\d]{24}/);
        if (idMatch) {
          imageIds.push(idMatch[0]);
        }
      }

      return uniq(imageIds);
    },
  );
