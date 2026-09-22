import { EntityState, createEntityAdapter } from '@ngrx/entity';
import { createReducer, on } from '@ngrx/store';
import { compact, pick } from 'lodash';

import { IMAGE_FORM_DATA_PROPERTIES, INITIAL_IMAGE_FORM_DATA } from '@app/constants';
import { DataPaginationOptions, Id, Image, ImageFormData, IsoDate } from '@app/models';
import { customSort } from '@app/utils';

import * as ImagesActions from './images.actions';

export type ImagesLoad = 'metadata' | 'filteredThumbnails' | 'mainImage';

export interface ImagesState extends EntityState<{
  image: Image;
  formData: ImageFormData;
}> {
  newImagesFormData: Record<string, ImageFormData>;
  // Loads whose latest attempt failed, which are never persisted
  failedLoads: ImagesLoad[];
  // Whether a page of filtered thumbnails is on its way, never persisted
  isFetchingFiltered: boolean;
  // Progress of the image uploads in flight, which is never persisted
  uploadProgress: { uploaded: number; total: number } | null;
  lastMetadataFetch: IsoDate | null;
  lastFilteredThumbnailsFetch: IsoDate | null;
  lastAlbumCoversFetch: IsoDate | null;
  filteredImages: Image[];
  options: DataPaginationOptions<Image>;
  filteredCount: number | null;
  totalCount: number;
}

export const imagesAdapter = createEntityAdapter<{
  image: Image;
  formData: ImageFormData;
}>({
  selectId: ({ image }) => image.id,
  sortComparer: (a, b) =>
    customSort(a, b, 'image.albumOrdinality', false, 'image.caption', false),
});

export const initialState: ImagesState = imagesAdapter.getInitialState({
  newImagesFormData: {},
  failedLoads: [],
  isFetchingFiltered: false,
  uploadProgress: null,
  lastMetadataFetch: null,
  lastFilteredThumbnailsFetch: null,
  lastAlbumCoversFetch: null,
  filteredImages: [],
  options: {
    page: 1,
    pageSize: 20,
    sortBy: 'modificationInfo',
    sortOrder: 'desc',
    filters: null,
    search: '',
  },
  filteredCount: null,
  totalCount: 0,
});

// A shared expiration covers whichever of the two presigned URLs an entity
// holds, so when a merge keeps one URL and refreshes the other, the recorded
// expiration must be the earlier of the two (ISO strings compare
// chronologically).
function earlierIso(a: IsoDate | undefined, b: IsoDate | undefined): IsoDate | undefined {
  if (!a || !b) {
    return a ?? b;
  }
  return a < b ? a : b;
}

function withLoadAttempt(state: ImagesState, load: ImagesLoad): ImagesState {
  return { ...state, failedLoads: state.failedLoads.filter(failed => failed !== load) };
}

function withFailedLoad(state: ImagesState, load: ImagesLoad): ImagesState {
  return { ...state, failedLoads: [...withLoadAttempt(state, load).failedLoads, load] };
}

export const imagesReducer = createReducer(
  initialState,

  on(ImagesActions.fetchAllImagesMetadataRequested, (state): ImagesState =>
    withLoadAttempt(state, 'metadata'),
  ),
  on(ImagesActions.fetchAllImagesMetadataFailed, (state): ImagesState =>
    withFailedLoad(state, 'metadata'),
  ),

  on(ImagesActions.fetchFilteredThumbnailsRequested, (state): ImagesState => ({
    ...withLoadAttempt(state, 'filteredThumbnails'),
    isFetchingFiltered: true,
  })),
  on(ImagesActions.fetchFilteredThumbnailsFailed, (state): ImagesState => ({
    ...withFailedLoad(state, 'filteredThumbnails'),
    isFetchingFiltered: false,
  })),

  on(ImagesActions.fetchMainImageRequested, (state): ImagesState =>
    withLoadAttempt(state, 'mainImage'),
  ),
  on(ImagesActions.fetchMainImageFailed, (state): ImagesState =>
    withFailedLoad(state, 'mainImage'),
  ),

  on(ImagesActions.imageUploadsProgressed, (state, { uploaded, total }): ImagesState => ({
    ...state,
    uploadProgress: { uploaded, total },
  })),
  on(
    ImagesActions.addImagesFailed,
    ImagesActions.updateAlbumFailed,
    (state): ImagesState => ({ ...state, uploadProgress: null }),
  ),

  on(ImagesActions.fetchAllImagesMetadataSucceeded, (state, { images }): ImagesState =>
    imagesAdapter.upsertMany(
      images.map(image => {
        const originalEntity = image ? state.entities[image.id] : null;

        return {
          image: {
            ...image,
            mainUrl: originalEntity?.image.mainUrl,
            thumbnailUrl: originalEntity?.image.thumbnailUrl,
            urlExpirationDate: originalEntity?.image.urlExpirationDate,
          },
          formData: pick(image, IMAGE_FORM_DATA_PROPERTIES),
        };
      }),
      {
        ...state,
        lastMetadataFetch: new Date(Date.now()).toISOString(),
      },
    ),
  ),

  on(
    ImagesActions.fetchFilteredThumbnailsSucceeded,
    (state, { images, filteredCount, totalCount }): ImagesState => {
      return imagesAdapter.upsertMany(
        images.map(image => {
          const originalEntity = image ? state.entities[image.id] : null;

          return {
            image: {
              ...image,
              mainUrl: originalEntity?.image.mainUrl,
              urlExpirationDate: originalEntity?.image.mainUrl
                ? earlierIso(
                    image.urlExpirationDate,
                    originalEntity.image.urlExpirationDate,
                  )
                : (image.urlExpirationDate ?? originalEntity?.image.urlExpirationDate),
            },
            formData: pick(image, IMAGE_FORM_DATA_PROPERTIES),
          };
        }),
        {
          ...state,
          isFetchingFiltered: false,
          lastFilteredThumbnailsFetch: new Date(Date.now()).toISOString(),
          filteredImages: images,
          filteredCount,
          totalCount,
        },
      );
    },
  ),

  on(
    ImagesActions.fetchBatchThumbnailsSucceeded,
    (state, { images, context }): ImagesState =>
      imagesAdapter.upsertMany(
        images.map(image => {
          const originalEntity = image ? state.entities[image.id] : null;

          return {
            image: {
              ...image,
              mainUrl: originalEntity?.image.mainUrl,
              urlExpirationDate: originalEntity?.image.mainUrl
                ? earlierIso(
                    image.urlExpirationDate,
                    originalEntity.image.urlExpirationDate,
                  )
                : (image.urlExpirationDate ?? originalEntity?.image.urlExpirationDate),
            },
            formData: pick(image, IMAGE_FORM_DATA_PROPERTIES),
          };
        }),
        {
          ...state,
          lastAlbumCoversFetch:
            context === 'album-covers'
              ? new Date(Date.now()).toISOString()
              : state.lastAlbumCoversFetch,
        },
      ),
  ),

  on(ImagesActions.paginationOptionsChanged, (state, { options }): ImagesState => ({
    ...state,
    options,
  })),

  on(ImagesActions.fetchMainImageSucceeded, (state, { image }): ImagesState => {
    const originalEntity = image ? state.entities[image.id] : null;

    return imagesAdapter.upsertOne(
      {
        image: {
          ...image,
          mainUrl: image.mainUrl ?? originalEntity?.image.mainUrl,
          thumbnailUrl: originalEntity?.image.thumbnailUrl,
          urlExpirationDate: originalEntity?.image.thumbnailUrl
            ? earlierIso(image.urlExpirationDate, originalEntity.image.urlExpirationDate)
            : (image.urlExpirationDate ?? originalEntity?.image.urlExpirationDate),
        },
        formData: originalEntity?.formData ?? pick(image, IMAGE_FORM_DATA_PROPERTIES),
      },
      state,
    );
  }),

  on(ImagesActions.addImageSucceeded, (state, { image }): ImagesState => {
    return imagesAdapter.upsertOne(
      {
        image,
        formData: pick(image, IMAGE_FORM_DATA_PROPERTIES),
      },
      { ...state, newImagesFormData: {} },
    );
  }),

  on(ImagesActions.addImagesSucceeded, (state, { images }): ImagesState => {
    return imagesAdapter.upsertMany(
      images.map(image => {
        const originalEntity = image ? state.entities[image.id] : null;

        return {
          image: {
            ...image,
            mainUrl: image.mainUrl ?? originalEntity?.image.mainUrl,
            thumbnailUrl: image.thumbnailUrl ?? originalEntity?.image.thumbnailUrl,
            urlExpirationDate:
              image.urlExpirationDate ?? originalEntity?.image.urlExpirationDate,
          },
          formData: pick(image, IMAGE_FORM_DATA_PROPERTIES),
        };
      }),
      { ...state, newImagesFormData: {}, uploadProgress: null },
    );
  }),

  on(
    ImagesActions.updateImageSucceeded,
    ImagesActions.automaticAlbumCoverSwitchSucceeded,
    (state, { baseImage }): ImagesState => {
      const originalEntity = baseImage ? state.entities[baseImage.id] : null;

      return imagesAdapter.upsertOne(
        {
          image: {
            ...originalEntity?.image,
            ...baseImage,
          } as Image,
          formData: pick(baseImage, IMAGE_FORM_DATA_PROPERTIES),
        },
        state,
      );
    },
  ),

  on(
    ImagesActions.updateAlbumSucceeded,
    (state, { newImages, updatedImages }): ImagesState => {
      const updatedImageEntities = compact(
        updatedImages.map(updatedImage => {
          const originalEntity = updatedImage ? state.entities[updatedImage.id] : null;
          if (!originalEntity) {
            console.warn(
              `[LCC] Unable to find image ${updatedImage.id} after successful album update`,
            );
            return undefined;
          }
          return {
            image: { ...originalEntity.image, ...updatedImage },
            formData: pick(updatedImage, IMAGE_FORM_DATA_PROPERTIES),
          };
        }),
      );

      const newImageEntities = newImages.map(image => ({
        image,
        formData: pick(image, IMAGE_FORM_DATA_PROPERTIES),
      }));

      const allEntities = [...updatedImageEntities, ...newImageEntities];

      return imagesAdapter.upsertMany(allEntities, {
        ...state,
        newImagesFormData: {},
        uploadProgress: null,
      });
    },
  ),

  on(ImagesActions.deleteImageSucceeded, (state, { image }): ImagesState =>
    imagesAdapter.removeOne(image.id, {
      ...state,
      filteredImages: state.filteredImages.filter(({ id }) => id !== image.id),
    }),
  ),

  on(ImagesActions.deleteAlbumSucceeded, (state, { imageIds }): ImagesState =>
    imagesAdapter.removeMany(imageIds, {
      ...state,
      filteredImages: state.filteredImages.filter(({ id }) => !imageIds.includes(id)),
    }),
  ),

  on(ImagesActions.formDataChanged, (state, { multipleFormData }): ImagesState => {
    if (!multipleFormData?.length) {
      return state;
    }

    const newImageValues: (Partial<ImageFormData> & { id: Id })[] = [];
    const existingImageValues: (Partial<ImageFormData> & { id: Id })[] = [];

    multipleFormData.forEach(formData => {
      if (formData.id.toString().startsWith('new')) {
        newImageValues.push(formData);
      } else {
        existingImageValues.push(formData);
      }
    });

    let newImagesFormData = { ...state.newImagesFormData };

    newImageValues.forEach(formData => {
      const { id } = formData;
      const existingFormData = newImagesFormData[id] || INITIAL_IMAGE_FORM_DATA;

      newImagesFormData = {
        ...newImagesFormData,
        [id]: {
          ...existingFormData,
          ...formData,
        },
      };
    });

    const updatedEntities = compact(
      existingImageValues.map(formData => {
        const { id } = formData;
        const originalEntity = state.entities[id];

        if (!originalEntity) {
          console.warn(
            `[LCC] Could not find image ${id} to update after form data change`,
          );
          return undefined;
        }

        return {
          ...originalEntity,
          formData: {
            ...originalEntity.formData,
            ...formData,
          },
        };
      }),
    );

    const stateWithNewImages = { ...state, newImagesFormData };

    return updatedEntities.length > 0
      ? imagesAdapter.upsertMany(updatedEntities, stateWithNewImages)
      : stateWithNewImages;
  }),

  on(ImagesActions.imageFormDataRestored, (state, { imageId }): ImagesState => {
    const originalImage = imageId ? state.entities[imageId]?.image : null;

    if (!originalImage) {
      return { ...state, newImagesFormData: {} };
    }

    return imagesAdapter.upsertOne(
      {
        image: originalImage,
        formData: pick(originalImage, IMAGE_FORM_DATA_PROPERTIES),
      },
      { ...state, newImagesFormData: {} },
    );
  }),

  on(ImagesActions.albumFormDataRestored, (state, { album }): ImagesState => {
    if (!album) {
      return { ...state, newImagesFormData: {} };
    }

    const albumEntities = compact(
      state.ids
        .map(id => state.entities[id])
        .filter(entity => entity?.image?.album === album),
    );

    if (!albumEntities.length) {
      return { ...state, newImagesFormData: {} };
    }

    return imagesAdapter.upsertMany(
      albumEntities.map(entity => ({
        image: entity.image,
        formData: pick(entity.image, IMAGE_FORM_DATA_PROPERTIES),
      })),
      { ...state, newImagesFormData: {} },
    );
  }),

  on(ImagesActions.newImageRemoved, (state, { imageId }): ImagesState => {
    const { [imageId]: removed, ...restNewImagesFormData } = state.newImagesFormData;

    return {
      ...state,
      newImagesFormData: restNewImagesFormData,
    };
  }),

  on(ImagesActions.allNewImagesRemoved, (state): ImagesState => {
    return {
      ...state,
      newImagesFormData: {},
    };
  }),
);
