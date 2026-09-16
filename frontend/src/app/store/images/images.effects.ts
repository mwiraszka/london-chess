import { Actions, createEffect, ofType } from '@ngrx/effects';
import { concatLatestFrom } from '@ngrx/operators';
import { Store } from '@ngrx/store';
import moment from 'moment-timezone';
import { Observable, combineLatest, forkJoin, from, merge, of, race, timer } from 'rxjs';
import {
  catchError,
  exhaustMap,
  filter,
  groupBy,
  map,
  mergeMap,
  switchMap,
  take,
  tap,
  timeout,
  toArray,
} from 'rxjs/operators';

import { Injectable, inject } from '@angular/core';

import { Article, BaseImage, Image, IndexedDbImageData, LccError } from '@app/models';
import { ImageFileService, ImagesApiService, UserService } from '@app/services';
import * as AppActions from '@app/store/app/app.actions';
import * as ArticlesActions from '@app/store/articles/articles.actions';
import * as ArticlesSelectors from '@app/store/articles/articles.selectors';
import * as AuthSelectors from '@app/store/auth/auth.selectors';
import * as NavSelectors from '@app/store/nav/nav.selectors';
import {
  BUILD_IMAGES_FORM_DATA,
  DATA_URL_TO_FILE,
  IS_EXPIRED,
  IS_LCC_ERROR,
  PARSE_ERROR,
} from '@app/tokens';
import { isDefined } from '@app/utils';

import * as ImagesActions from './images.actions';
import * as ImagesSelectors from './images.selectors';

@Injectable()
export class ImagesEffects {
  private readonly buildImagesFormData = inject(BUILD_IMAGES_FORM_DATA);
  private readonly dataUrlToFile = inject(DATA_URL_TO_FILE);
  private readonly isExpired = inject(IS_EXPIRED);
  private readonly isLccError = inject(IS_LCC_ERROR);
  private readonly parseError = inject(PARSE_ERROR);
  private readonly userService = inject(UserService);

  // Serverless functions cap the request body (~4.5MB), so images are uploaded one
  // file per request with a small concurrency pool rather than one large batch.
  private readonly UPLOAD_CONCURRENCY = 5;

  // Uploads a single new image (one file per request) and removes it from IndexedDB
  // staging on success, so a partial failure leaves only failed images staged.
  private uploadSingleNewImage(
    metadata: Omit<BaseImage, 'fileSize'>,
    indexedDbImageData: IndexedDbImageData[],
  ): Observable<{ success: boolean; images: Image[] }> {
    const formData = this.buildImagesFormData([metadata], indexedDbImageData, []);

    if (this.isLccError(formData)) {
      return of({ success: false, images: [] });
    }

    return this.imagesApiService.addImages(formData).pipe(
      switchMap(response =>
        from(this.imageFileService.deleteImage(metadata.id)).pipe(
          map(() => ({ success: true, images: response.data })),
        ),
      ),
      catchError(() => of({ success: false, images: [] })),
    );
  }

  // Updates the metadata of existing album images in a single (file-less) request.
  private updateExistingImages(
    existingImages: BaseImage[],
  ): Observable<{ updatedImages: BaseImage[]; failed: number }> {
    const formData = this.buildImagesFormData([], [], existingImages);

    if (this.isLccError(formData)) {
      return of({ updatedImages: [], failed: 1 });
    }

    return this.imagesApiService.updateImages(formData).pipe(
      map(response => ({ updatedImages: response.data.updatedImages, failed: 0 })),
      catchError(() => of({ updatedImages: [], failed: 1 })),
    );
  }

  fetchAllImagesMetadata$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(ImagesActions.fetchAllImagesMetadataRequested),
      switchMap(() =>
        race(
          this.imagesApiService.getAllImagesMetadata().pipe(
            map(response =>
              ImagesActions.fetchAllImagesMetadataSucceeded({
                images: response.data,
              }),
            ),
            catchError(error =>
              of(
                ImagesActions.fetchAllImagesMetadataFailed({
                  error: this.parseError(error),
                }),
              ),
            ),
          ),
          timer(10_000).pipe(map(() => ImagesActions.requestTimedOut())),
        ),
      ),
    );
  });

  fetchFilteredThumbnailImages$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(ImagesActions.fetchFilteredThumbnailsRequested),
      concatLatestFrom(() => this.store.select(ImagesSelectors.selectOptions)),
      switchMap(([, options]) =>
        this.imagesApiService.getFilteredThumbnailImages(options).pipe(
          map(response =>
            ImagesActions.fetchFilteredThumbnailsSucceeded({
              images: response.data.items,
              filteredCount: response.data.filteredCount,
              totalCount: response.data.totalCount,
            }),
          ),
          catchError(error =>
            of(
              ImagesActions.fetchFilteredThumbnailsFailed({
                error: this.parseError(error),
              }),
            ),
          ),
        ),
      ),
    );
  });

  fetchBatchThumbnailImages$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(ImagesActions.fetchBatchThumbnailsRequested),
      mergeMap(({ imageIds, context }) =>
        this.imagesApiService.getBatchThumbnailImages(imageIds).pipe(
          timeout(30000),
          map(response =>
            ImagesActions.fetchBatchThumbnailsSucceeded({
              images: response.data,
              context,
            }),
          ),
          catchError(error =>
            of(
              ImagesActions.fetchBatchThumbnailsFailed({
                error: this.parseError(error),
              }),
            ),
          ),
        ),
      ),
    );
  });

  fetchAlbumThumbnailImages$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(ImagesActions.fetchAlbumThumbnailsRequested),
      // Ensure metadata has been loaded; if not, fetch it first
      mergeMap(({ album }) =>
        this.store.select(ImagesSelectors.selectLastMetadataFetch).pipe(
          take(1),
          switchMap(lastFetch => {
            if (!lastFetch) {
              // Trigger metadata fetch and wait until it succeeds before proceeding
              this.store.dispatch(ImagesActions.fetchAllImagesMetadataRequested());
              return this.actions$.pipe(
                ofType(ImagesActions.fetchAllImagesMetadataSucceeded),
                take(1),
                switchMap(() =>
                  this.store
                    .select(ImagesSelectors.selectImagesByAlbum(album))
                    .pipe(take(1)),
                ),
              );
            }
            return this.store
              .select(ImagesSelectors.selectImagesByAlbum(album))
              .pipe(take(1));
          }),
          filter(ids => !!ids.length),
          map(images => images.map(image => image.id)),
          switchMap(imageIds =>
            this.imagesApiService.getBatchThumbnailImages(imageIds).pipe(
              map(response =>
                ImagesActions.fetchBatchThumbnailsSucceeded({
                  images: response.data,
                  context: 'photos-in-album',
                }),
              ),
              catchError(error =>
                of(
                  ImagesActions.fetchBatchThumbnailsFailed({
                    error: this.parseError(error),
                  }),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  });

  fetchArticleBannerThumbnails$ = createEffect(() =>
    this.actions$.pipe(
      ofType(
        ArticlesActions.fetchHomePageArticlesSucceeded,
        ArticlesActions.fetchFilteredArticlesSucceeded,
        ImagesActions.fetchAllImagesMetadataSucceeded,
      ),
      switchMap(() =>
        this.store.select(ArticlesSelectors.selectHomePageArticles).pipe(
          concatLatestFrom(() =>
            this.store.select(ArticlesSelectors.selectFilteredArticles),
          ),
          map(([home, filtered]) => [...home, ...filtered]),
          take(1),
        ),
      ),
      switchMap(articles =>
        this.store
          .select(
            ImagesSelectors.selectIdsOfArticleBannerImagesWithMissingOrExpiredThumbnailUrls(
              articles,
            ),
          )
          .pipe(take(1)),
      ),
      filter(ids => ids.length > 0),
      map(imageIds =>
        ImagesActions.fetchBatchThumbnailsRequested({
          imageIds,
          context: 'article-banner-images',
        }),
      ),
    ),
  );

  fetchArticleImages$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(
        ArticlesActions.fetchArticleSucceeded,
        ArticlesActions.formDataChanged,
        ImagesActions.fetchAllImagesMetadataSucceeded,
      ),
      concatLatestFrom(() => this.store.select(ArticlesSelectors.selectAllArticles)),
      mergeMap(([action, allArticles]) => {
        let articlesToProcess: Article[];

        if (action.type === ArticlesActions.fetchArticleSucceeded.type) {
          articlesToProcess = [action.article];
        } else if (action.type === ArticlesActions.formDataChanged.type) {
          articlesToProcess = allArticles.filter(
            a => a?.id === action.articleId,
          ) as Article[];
        } else {
          articlesToProcess = allArticles.filter(isDefined);
        }

        return from(articlesToProcess).pipe(
          mergeMap(article =>
            this.store.select(ImagesSelectors.selectImageIdsByArticleId(article.id)).pipe(
              take(1),
              map(imageIds => ({ article, imageIds })),
            ),
          ),
        );
      }),
      mergeMap(({ imageIds }) => {
        return from(imageIds).pipe(
          mergeMap(imageId =>
            this.store.select(ImagesSelectors.selectImageById(imageId)).pipe(
              take(1),
              map(image => ({ imageId, image })),
            ),
          ),
          filter(({ image }) => {
            // Refresh if the image is missing, has no main URL, or its presigned
            // URL is within 2h of expiring (backend issues 12h URLs).
            return (
              !image ||
              !image.mainUrl ||
              !image.urlExpirationDate ||
              moment(image.urlExpirationDate).isBefore(moment().add(2, 'hours'))
            );
          }),
          map(({ imageId }) =>
            ImagesActions.fetchMainImageInBackgroundRequested({ imageId }),
          ),
        );
      }),
    );
  });

  // One pipeline for both foreground and background requests, grouped by image
  // id so concurrent requests for the same image collapse into a single call.
  // Background failures dispatch a separate action that never surfaces a toast.
  fetchMainImage$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(
        ImagesActions.fetchMainImageRequested,
        ImagesActions.fetchMainImageInBackgroundRequested,
      ),
      groupBy(({ imageId }) => imageId),
      mergeMap(group$ =>
        group$.pipe(
          exhaustMap(action =>
            this.imagesApiService.getMainImage(action.imageId).pipe(
              timeout(30000),
              map(response =>
                ImagesActions.fetchMainImageSucceeded({ image: response.data }),
              ),
              catchError(error =>
                of(
                  action.type === ImagesActions.fetchMainImageRequested.type
                    ? ImagesActions.fetchMainImageFailed({
                        error: this.parseError(error),
                      })
                    : ImagesActions.fetchMainImageInBackgroundFailed({
                        error: this.parseError(error),
                      }),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  });

  refetchMetadata$ = createEffect(() => {
    const refetchActions$ = this.actions$.pipe(
      ofType(
        AppActions.refreshAppRequested,
        ImagesActions.addImageSucceeded,
        ImagesActions.addImagesSucceeded,
        ImagesActions.updateImageSucceeded,
        ImagesActions.updateAlbumSucceeded,
        ImagesActions.deleteImageSucceeded,
        ImagesActions.deleteAlbumSucceeded,
        ImagesActions.automaticAlbumCoverSwitchSucceeded,
      ),
    );

    const periodicCheck$ = timer(4000, 5 * 60 * 1000).pipe(
      switchMap(() =>
        this.store.select(ImagesSelectors.selectLastMetadataFetch).pipe(take(1)),
      ),
      filter(lastFetch => this.isExpired(lastFetch)),
    );

    return merge(refetchActions$, periodicCheck$).pipe(
      map(() => ImagesActions.fetchAllImagesMetadataRequested()),
    );
  });

  refetchFilteredThumbnails$ = createEffect(() => {
    const refetchActions$ = this.actions$.pipe(
      ofType(
        AppActions.refreshAppRequested,
        ImagesActions.addImageSucceeded,
        ImagesActions.addImagesSucceeded,
        ImagesActions.updateImageSucceeded,
        ImagesActions.updateAlbumSucceeded,
        ImagesActions.deleteImageSucceeded,
        ImagesActions.deleteAlbumSucceeded,
        ImagesActions.automaticAlbumCoverSwitchSucceeded,
        ImagesActions.paginationOptionsChanged,
      ),
    );

    const periodicCheck$ = timer(5500, 5 * 60 * 1000).pipe(
      switchMap(() =>
        combineLatest([
          this.store.select(ImagesSelectors.selectLastFilteredThumbnailsFetch),
          this.store.select(NavSelectors.selectCurrentPath),
        ]).pipe(take(1)),
      ),
      filter(
        ([lastFetch, currentPath]) =>
          this.isExpired(lastFetch) &&
          !!(
            currentPath?.includes('/photo-gallery') ||
            currentPath?.includes('/album') ||
            currentPath?.includes('/image')
          ),
      ),
    );

    return merge(refetchActions$, periodicCheck$).pipe(
      map(() => ImagesActions.fetchFilteredThumbnailsRequested()),
    );
  });

  refetchAlbumCoverThumbnails$ = createEffect(() => {
    const refetchActions$ = this.actions$.pipe(
      ofType(
        AppActions.refreshAppRequested,
        ImagesActions.addImageSucceeded,
        ImagesActions.addImagesSucceeded,
        ImagesActions.updateImageSucceeded,
        ImagesActions.updateAlbumSucceeded,
        ImagesActions.deleteImageSucceeded,
        ImagesActions.deleteAlbumSucceeded,
        ImagesActions.automaticAlbumCoverSwitchSucceeded,
      ),
    );

    const periodicCheck$ = timer(7000, 5 * 60 * 1000).pipe(
      switchMap(() =>
        this.store.select(ImagesSelectors.selectLastAlbumCoversFetch).pipe(take(1)),
      ),
      filter(lastFetch => this.isExpired(lastFetch)),
    );

    return merge(refetchActions$, periodicCheck$).pipe(
      switchMap(() => this.store.select(ImagesSelectors.selectLastMetadataFetch)),
      filter(lastMetadataFetch => !this.isExpired(lastMetadataFetch)),
      switchMap(() =>
        this.store
          .select(ImagesSelectors.selectIdsOfAlbumCoversWithMissingOrExpiredThumbnailUrls)
          .pipe(take(1)),
      ),
      filter(imageIds => imageIds.length > 0),
      map(imageIds => {
        return ImagesActions.fetchBatchThumbnailsRequested({
          imageIds,
          context: 'album-covers',
        });
      }),
    );
  });

  retryFailedArticleBannerImages$ = createEffect(() => {
    // Periodic check to retry failed/expired article banner images, but only
    // while the user is on a page that actually renders article banners.
    const periodicCheck$ = timer(5 * 60 * 1000, 10 * 60 * 1000).pipe(
      switchMap(() => this.store.select(NavSelectors.selectCurrentPath).pipe(take(1))),
      filter(
        currentPath =>
          currentPath === '' || currentPath === '/' || !!currentPath?.includes('/news'),
      ),
      switchMap(() =>
        combineLatest([
          this.store.select(ArticlesSelectors.selectHomePageArticles),
          this.store.select(ArticlesSelectors.selectFilteredArticles),
        ]).pipe(
          map(([home, filtered]) =>
            [...home, ...filtered].filter(article => article.bannerImageId),
          ),
          take(1),
        ),
      ),
      switchMap(articles =>
        this.store
          .select(
            ImagesSelectors.selectIdsOfArticleBannerImagesWithMissingOrExpiredThumbnailUrls(
              articles,
            ),
          )
          .pipe(take(1)),
      ),
      filter(imageIds => imageIds.length > 0),
      map(imageIds =>
        ImagesActions.fetchBatchThumbnailsRequested({
          imageIds,
          context: 'article-banner-images',
        }),
      ),
    );

    return periodicCheck$;
  });

  addImage$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(ImagesActions.addImageRequested),
      mergeMap(({ imageId }) => from(this.imageFileService.getImage(imageId))),
      concatLatestFrom(() => [
        this.store.select(AuthSelectors.selectUser).pipe(filter(isDefined)),
        this.store.select(ImagesSelectors.selectNewImageFormData).pipe(filter(isDefined)),
        this.store.select(ImagesSelectors.selectAllExistingAlbums),
      ]),
      mergeMap(([imageFileResult, user, formData, existingAlbums]) => {
        if (this.isLccError(imageFileResult)) {
          return of(ImagesActions.addImageFailed({ error: imageFileResult }));
        }

        const file = this.dataUrlToFile(imageFileResult.dataUrl, formData.filename);

        if (!file) {
          const error: LccError = {
            name: 'LCCError',
            message: `Unable to construct file object from image data URL for ${formData.filename}`,
          };
          return of(ImagesActions.addImageFailed({ error }));
        }

        const imageMetadata: Omit<BaseImage, 'fileSize'> = {
          id: formData.id,
          filename: formData.filename,
          caption: formData.caption,
          album: formData.album,
          albumCover: !existingAlbums.includes(formData.album)
            ? true
            : formData.albumCover,
          albumOrdinality: formData.albumOrdinality,
          modificationInfo: {
            createdBy: `${user.firstName} ${user.lastName}`,
            createdByNumber: this.userService.memberNumber(),
            dateCreated: moment().toISOString(),
            lastEditedBy: `${user.firstName} ${user.lastName}`,
            lastEditedByNumber: this.userService.memberNumber(),
            dateLastEdited: moment().toISOString(),
          },
        };

        const imageFormData = new FormData();
        imageFormData.append('files', file);
        imageFormData.append('imageMetadata', JSON.stringify(imageMetadata));

        return this.imagesApiService.addImages(imageFormData).pipe(
          map(response => ImagesActions.addImageSucceeded({ image: response.data[0] })),
          catchError(error =>
            of(ImagesActions.addImageFailed({ error: this.parseError(error) })),
          ),
        );
      }),
    );
  });

  addImages$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(ImagesActions.addImagesRequested),
      mergeMap(() => from(this.imageFileService.getAllImages())),
      concatLatestFrom(() => [
        this.store.select(AuthSelectors.selectUser).pipe(filter(isDefined)),
        this.store.select(ImagesSelectors.selectNewImagesFormData),
      ]),
      mergeMap(([imageFilesResult, user, newImagesFormData]) => {
        if (this.isLccError(imageFilesResult)) {
          return of(ImagesActions.addImageFailed({ error: imageFilesResult }));
        }

        if (!imageFilesResult.length) {
          const error: LccError = {
            name: 'LCCError',
            message: 'No image data found in IndexedDB',
          };
          return of(ImagesActions.addImageFailed({ error }));
        }

        const newImagesMetadata: Omit<BaseImage, 'fileSize'>[] = [];

        for (const indexedDbImage of imageFilesResult) {
          const { id, filename } = indexedDbImage;
          const formData = newImagesFormData[id];

          if (!formData) {
            const error: LccError = {
              name: 'LCCError',
              message: `Unable to retrieve form data for ${filename}`,
            };
            return of(ImagesActions.addImagesFailed({ error }));
          }

          newImagesMetadata.push({
            id,
            filename,
            caption: formData.caption,
            album: formData.album,
            albumCover: formData.albumCover,
            albumOrdinality: formData.albumOrdinality,
            modificationInfo: {
              createdBy: `${user.firstName} ${user.lastName}`,
              createdByNumber: this.userService.memberNumber(),
              dateCreated: moment().toISOString(),
              lastEditedBy: `${user.firstName} ${user.lastName}`,
              lastEditedByNumber: this.userService.memberNumber(),
              dateLastEdited: moment().toISOString(),
            },
          });
        }

        return from(newImagesMetadata).pipe(
          mergeMap(
            metadata => this.uploadSingleNewImage(metadata, imageFilesResult),
            this.UPLOAD_CONCURRENCY,
          ),
          toArray(),
          map(results => {
            const images = results.flatMap(result => result.images);
            const failedCount = results.filter(result => !result.success).length;

            if (failedCount > 0) {
              const error: LccError = {
                name: 'LCCError',
                message: `${failedCount} of ${newImagesMetadata.length} image${newImagesMetadata.length === 1 ? '' : 's'} failed to upload`,
              };
              return ImagesActions.addImagesFailed({ error });
            }

            return ImagesActions.addImagesSucceeded({ images });
          }),
        );
      }),
    );
  });

  updateImage$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(ImagesActions.updateImageRequested),
      concatLatestFrom(({ imageId }) => [
        this.store
          .select(ImagesSelectors.selectImageEntityById(imageId))
          .pipe(filter(isDefined)),
        this.store.select(AuthSelectors.selectUser).pipe(filter(isDefined)),
      ]),
      mergeMap(([, { image, formData }, user]) => {
        const updatedImage: BaseImage = {
          id: image.id,
          filename: image.filename,
          caption: formData.caption,
          album: formData.album,
          albumCover: formData.albumCover,
          albumOrdinality: formData.albumOrdinality,
          modificationInfo: {
            ...image.modificationInfo,
            lastEditedBy: `${user.firstName} ${user.lastName}`,
            lastEditedByNumber: this.userService.memberNumber(),
            dateLastEdited: moment().toISOString(),
          },
        };

        const imagesFormData = this.buildImagesFormData([], [], [updatedImage]);

        if (this.isLccError(imagesFormData)) {
          return of(
            ImagesActions.updateImageFailed({
              baseImage: updatedImage,
              error: imagesFormData,
            }),
          );
        }

        return this.imagesApiService.updateImages(imagesFormData).pipe(
          map(response => {
            const { newImages, updatedImages } = response.data;

            if (newImages.length !== 0 || updatedImages.length !== 1) {
              const error: LccError = {
                name: 'LCCError',
                message: `Expected 0 images to be added and 1 image to be updated, but backend reported ${newImages.length} added and ${updatedImages.length} updated.`,
              };
              return ImagesActions.updateImageFailed({ baseImage: updatedImage, error });
            }

            return ImagesActions.updateImageSucceeded({ baseImage: updatedImage });
          }),
          catchError(error =>
            of(
              ImagesActions.updateImageFailed({
                baseImage: updatedImage,
                error: this.parseError(error),
              }),
            ),
          ),
        );
      }),
    );
  });

  updateAlbum$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(ImagesActions.updateAlbumRequested),
      mergeMap(({ album }) =>
        from(this.imageFileService.getAllImages()).pipe(
          map(indexedDbImageDataResult => ({ album, indexedDbImageDataResult })),
        ),
      ),
      concatLatestFrom(({ album }) => [
        this.store.select(ImagesSelectors.selectImageEntitiesByAlbum(album)),
        this.store.select(ImagesSelectors.selectNewImagesFormData),
        this.store.select(AuthSelectors.selectUser).pipe(filter(isDefined)),
      ]),
      mergeMap(
        ([{ album, indexedDbImageDataResult }, entities, newImagesFormData, user]) => {
          const existingImages: BaseImage[] = entities.map(({ image, formData }) => ({
            id: image.id,
            filename: image.filename,
            caption: formData.caption,
            album: formData.album,
            albumCover: formData.albumCover,
            albumOrdinality: formData.albumOrdinality,
            modificationInfo: {
              ...image.modificationInfo,
              lastEditedBy: `${user.firstName} ${user.lastName}`,
              lastEditedByNumber: this.userService.memberNumber(),
              dateLastEdited: moment().toISOString(),
            },
          }));

          const newImagesMetadata: Omit<BaseImage, 'fileSize'>[] = [];

          if (
            !this.isLccError(indexedDbImageDataResult) &&
            indexedDbImageDataResult.length > 0
          ) {
            for (const indexedDbImageData of indexedDbImageDataResult) {
              const { id, filename } = indexedDbImageData;
              const formData = newImagesFormData[id];

              if (!formData) {
                const error: LccError = {
                  name: 'LCCError',
                  message: 'Mismatch between image file data and form data',
                };
                return of(ImagesActions.updateAlbumFailed({ album, error }));
              }

              newImagesMetadata.push({
                id,
                filename,
                caption: formData.caption,
                album: formData.album,
                albumCover: formData.albumCover,
                albumOrdinality: formData.albumOrdinality,
                modificationInfo: {
                  createdBy: `${user.firstName} ${user.lastName}`,
                  createdByNumber: this.userService.memberNumber(),
                  dateCreated: moment().toISOString(),
                  lastEditedBy: `${user.firstName} ${user.lastName}`,
                  lastEditedByNumber: this.userService.memberNumber(),
                  dateLastEdited: moment().toISOString(),
                },
              });
            }
          }

          // New images upload one file per request (concurrency-bounded); existing
          // image edits go in a single file-less request, well under the body limit.
          const newImages$ = newImagesMetadata.length
            ? from(newImagesMetadata).pipe(
                mergeMap(
                  metadata =>
                    this.uploadSingleNewImage(
                      metadata,
                      indexedDbImageDataResult as IndexedDbImageData[],
                    ),
                  this.UPLOAD_CONCURRENCY,
                ),
                toArray(),
                map(results => ({
                  newImages: results.flatMap(result => result.images),
                  failed: results.filter(result => !result.success).length,
                })),
              )
            : of({ newImages: [] as Image[], failed: 0 });

          const updatedImages$ = existingImages.length
            ? this.updateExistingImages(existingImages)
            : of({ updatedImages: [] as BaseImage[], failed: 0 });

          return forkJoin([newImages$, updatedImages$]).pipe(
            map(([newResult, updateResult]) => {
              const failedCount = newResult.failed + updateResult.failed;

              if (failedCount > 0) {
                const error: LccError = {
                  name: 'LCCError',
                  message: `${failedCount} image operation${failedCount === 1 ? '' : 's'} failed`,
                };
                return ImagesActions.updateAlbumFailed({ album, error });
              }

              return ImagesActions.updateAlbumSucceeded({
                album,
                newImages: newResult.newImages,
                updatedImages: updateResult.updatedImages,
              });
            }),
          );
        },
      ),
    );
  });

  deleteImage$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(ImagesActions.deleteImageRequested),
      mergeMap(({ image }) => {
        return this.imagesApiService.deleteImage(image.id).pipe(
          filter(response => response.data === image.id),
          map(() => ImagesActions.deleteImageSucceeded({ image })),
          catchError(error =>
            of(ImagesActions.deleteImageFailed({ image, error: this.parseError(error) })),
          ),
        );
      }),
    );
  });

  deleteAlbum$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(ImagesActions.deleteAlbumRequested),
      mergeMap(({ album }) => {
        return this.imagesApiService.deleteAlbum(album).pipe(
          map(response =>
            ImagesActions.deleteAlbumSucceeded({ album, imageIds: response.data }),
          ),
          catchError(error =>
            of(ImagesActions.deleteAlbumFailed({ album, error: this.parseError(error) })),
          ),
        );
      }),
    );
  });

  automaticallyUpdateAlbumCoverAfterImageDeletion$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(ImagesActions.deleteImageSucceeded),
      filter(({ image }) => image.albumCover),
      concatLatestFrom(({ image }) =>
        this.store.select(ImagesSelectors.selectImagesByAlbum(image.album)),
      ),
      filter(([, imagesInAlbum]) => !!imagesInAlbum?.length),
      map(([, imagesInAlbum]) => {
        const newAlbumCoverImage = imagesInAlbum![0];
        const updatedImage: BaseImage = {
          id: newAlbumCoverImage.id,
          filename: newAlbumCoverImage.filename,
          caption: newAlbumCoverImage.caption,
          modificationInfo: newAlbumCoverImage.modificationInfo,
          album: newAlbumCoverImage.album,
          albumCover: true,
          albumOrdinality: newAlbumCoverImage.albumOrdinality,
        };
        return updatedImage;
      }),
      mergeMap(updatedImage => {
        const imagesFormData = this.buildImagesFormData([], [], [updatedImage]);

        if (this.isLccError(imagesFormData)) {
          return of(
            ImagesActions.automaticAlbumCoverSwitchFailed({
              album: updatedImage.album,
              error: imagesFormData,
            }),
          );
        }

        return this.imagesApiService.updateImages(imagesFormData).pipe(
          map(response => {
            const { newImages, updatedImages } = response.data;

            if (newImages.length !== 0 || updatedImages.length !== 1) {
              const error: LccError = {
                name: 'LCCError',
                message: `Expected 0 images to be added and 1 image to be updated, but backend reported ${newImages.length} added and ${updatedImages.length} updated.`,
              };
              return ImagesActions.automaticAlbumCoverSwitchFailed({
                album: updatedImage.album,
                error,
              });
            }

            return ImagesActions.automaticAlbumCoverSwitchSucceeded({
              baseImage: updatedImage,
            });
          }),
          catchError(error =>
            of(
              ImagesActions.automaticAlbumCoverSwitchFailed({
                album: updatedImage.album,
                error: this.parseError(error),
              }),
            ),
          ),
        );
      }),
    );
  });

  clearIndexedDbImageFileData$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(ImagesActions.imageFormDataRestored, ImagesActions.albumFormDataRestored),
        tap(() => this.imageFileService.clearAllImages()),
      ),
    { dispatch: false },
  );

  constructor(
    private readonly actions$: Actions,
    private readonly imageFileService: ImageFileService,
    private readonly imagesApiService: ImagesApiService,
    private readonly store: Store,
  ) {}
}
