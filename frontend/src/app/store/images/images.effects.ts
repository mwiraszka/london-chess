import { Actions, createEffect, ofType } from '@ngrx/effects';
import { concatLatestFrom } from '@ngrx/operators';
import { Action, Store } from '@ngrx/store';
import {
  EMPTY,
  Observable,
  combineLatest,
  concat,
  forkJoin,
  from,
  merge,
  of,
  timer,
} from 'rxjs';
import {
  catchError,
  exhaustMap,
  filter,
  groupBy,
  map,
  mergeMap,
  pairwise,
  shareReplay,
  switchMap,
  take,
  tap,
  toArray,
} from 'rxjs/operators';

import { Injectable, inject } from '@angular/core';

import { Article, BaseImage, Image, LccError, NewImageFile } from '@app/models';
import { ImageFileService, ImagesApiService } from '@app/services';
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
import { creditEditor, isDefined } from '@app/utils';
import moment from '@app/utils/datetime/moment';

import * as ImagesActions from './images.actions';
import * as ImagesSelectors from './images.selectors';

@Injectable()
export class ImagesEffects {
  private readonly actions$ = inject(Actions);
  private readonly imageFileService = inject(ImageFileService);
  private readonly imagesApiService = inject(ImagesApiService);
  private readonly store = inject(Store);

  private readonly buildImagesFormData = inject(BUILD_IMAGES_FORM_DATA);
  private readonly dataUrlToFile = inject(DATA_URL_TO_FILE);
  private readonly isExpired = inject(IS_EXPIRED);
  private readonly isLccError = inject(IS_LCC_ERROR);
  private readonly parseError = inject(PARSE_ERROR);

  // Serverless functions cap the request body (~4.5MB), so images are uploaded one
  // file per request with a small concurrency pool rather than one large batch.
  private readonly UPLOAD_CONCURRENCY = 5;

  // Uploads a single new image (one file per request) and drops its file on success,
  // so a partial failure leaves only failed images staged.
  private uploadSingleNewImage(
    metadata: Omit<BaseImage, 'fileSize'>,
    newImageFiles: NewImageFile[],
  ): Observable<{ success: boolean; images: Image[] }> {
    const formData = this.buildImagesFormData([metadata], newImageFiles, []);

    if (this.isLccError(formData)) {
      return of({ success: false, images: [] });
    }

    return this.imagesApiService.addImages(formData).pipe(
      tap(() => this.imageFileService.deleteImages([metadata.id])),
      map(response => ({ success: true, images: response.data })),
      catchError(() => of({ success: false, images: [] })),
    );
  }

  private uploadNewImages(
    newImagesMetadata: Omit<BaseImage, 'fileSize'>[],
    newImageFiles: NewImageFile[],
  ): {
    progress$: Observable<Action>;
    results$: Observable<{ success: boolean; images: Image[] }[]>;
  } {
    const total = newImagesMetadata.length;
    const uploads$ = from(newImagesMetadata).pipe(
      mergeMap(
        metadata => this.uploadSingleNewImage(metadata, newImageFiles),
        this.UPLOAD_CONCURRENCY,
      ),
      // Run once and replayed, as every upload can settle before the results subscribe
      shareReplay(),
    );

    return {
      progress$: concat(
        of(ImagesActions.imageUploadsProgressed({ uploaded: 0, total })),
        uploads$.pipe(
          map((_, index) =>
            ImagesActions.imageUploadsProgressed({ uploaded: index + 1, total }),
          ),
        ),
      ),
      results$: uploads$.pipe(toArray()),
    };
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
              // Trigger metadata fetch and wait until it settles before proceeding
              this.store.dispatch(ImagesActions.fetchAllImagesMetadataRequested());
              return this.actions$.pipe(
                ofType(
                  ImagesActions.fetchAllImagesMetadataSucceeded,
                  ImagesActions.fetchAllImagesMetadataFailed,
                ),
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
      concatLatestFrom(() => [
        this.store.select(ArticlesSelectors.selectAllArticles),
        this.store.select(NavSelectors.selectCurrentPath),
      ]),
      mergeMap(([action, allArticles, currentPath]) => {
        let articlesToProcess: Article[];

        if (action.type === ArticlesActions.fetchArticleSucceeded.type) {
          articlesToProcess = [action.article];
        } else if (action.type === ArticlesActions.formDataChanged.type) {
          articlesToProcess = allArticles.filter(
            a => a?.id === action.articleId,
          ) as Article[];
        } else {
          // Only the article open on screen shows its images at full size; lists of
          // articles show thumbnails, so fetching every article's full images is wasted
          const openArticleId = currentPath?.match(
            /^\/article\/(?:view|edit)\/([^/?#]+)/,
          )?.[1];
          articlesToProcess = allArticles.filter(
            article => isDefined(article) && article.id === openArticleId,
          ) as Article[];
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

    const periodicCheck$ = timer(0, 5 * 60 * 1000).pipe(
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
    const refetchActions$ = merge(
      this.actions$.pipe(
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
      ),
      this.actions$.pipe(ofType(ImagesActions.paginationOptionsChanged)),
    );

    const periodicCheck$ = timer(0, 5 * 60 * 1000).pipe(
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

  // Every metadata refresh can change which images are album covers
  refetchAlbumCoverThumbnails$ = createEffect(() => {
    const metadataRefreshed$ = this.actions$.pipe(
      ofType(ImagesActions.fetchAllImagesMetadataSucceeded),
    );

    const periodicCheck$ = timer(0, 5 * 60 * 1000).pipe(
      switchMap(() =>
        combineLatest([
          this.store.select(ImagesSelectors.selectLastAlbumCoversFetch),
          this.store.select(ImagesSelectors.selectLastMetadataFetch),
        ]).pipe(take(1)),
      ),
      filter(
        ([lastAlbumCoversFetch, lastMetadataFetch]) =>
          this.isExpired(lastAlbumCoversFetch) && !this.isExpired(lastMetadataFetch),
      ),
    );

    return merge(metadataRefreshed$, periodicCheck$).pipe(
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
      map(({ imageId }) => this.imageFileService.getImage(imageId)),
      concatLatestFrom(() => [
        this.store.select(AuthSelectors.selectUser).pipe(filter(isDefined)),
        this.store.select(ImagesSelectors.selectNewImageFormData).pipe(filter(isDefined)),
        this.store.select(ImagesSelectors.selectAllExistingAlbums),
      ]),
      mergeMap(([imageFile, user, formData, existingAlbums]) => {
        if (!imageFile) {
          const error: LccError = {
            name: 'LCCError',
            message: `No image file found for ${formData.filename}`,
          };
          return of(ImagesActions.addImageFailed({ error }));
        }

        const file = this.dataUrlToFile(imageFile.dataUrl, formData.filename);

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
          modificationInfo: creditEditor(user),
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
      concatLatestFrom(() => [
        this.store.select(AuthSelectors.selectUser).pipe(filter(isDefined)),
        this.store.select(ImagesSelectors.selectNewImagesFormData),
      ]),
      mergeMap(([, user, newImagesFormData]) => {
        const newImageFiles = this.imageFileService.getImages(
          Object.keys(newImagesFormData),
        );

        if (!newImageFiles.length) {
          const error: LccError = {
            name: 'LCCError',
            message: 'No image files found',
          };
          return of(ImagesActions.addImagesFailed({ error }));
        }

        const newImagesMetadata: Omit<BaseImage, 'fileSize'>[] = [];

        for (const { id, filename } of newImageFiles) {
          const formData = newImagesFormData[id];

          newImagesMetadata.push({
            id,
            filename,
            caption: formData.caption,
            album: formData.album,
            albumCover: formData.albumCover,
            albumOrdinality: formData.albumOrdinality,
            modificationInfo: creditEditor(user),
          });
        }

        const { progress$, results$ } = this.uploadNewImages(
          newImagesMetadata,
          newImageFiles,
        );

        const result$ = results$.pipe(
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

        return merge(progress$, result$);
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
          modificationInfo: creditEditor(user, image.modificationInfo),
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
      concatLatestFrom(({ album }) => [
        this.store.select(ImagesSelectors.selectImageEntitiesByAlbum(album)),
        this.store.select(ImagesSelectors.selectNewImagesFormData),
        this.store.select(AuthSelectors.selectUser).pipe(filter(isDefined)),
      ]),
      mergeMap(([{ album }, entities, newImagesFormData, user]) => {
        const existingImages: BaseImage[] = entities.map(({ image, formData }) => ({
          id: image.id,
          filename: image.filename,
          caption: formData.caption,
          album: formData.album,
          albumCover: formData.albumCover,
          albumOrdinality: formData.albumOrdinality,
          modificationInfo: creditEditor(user, image.modificationInfo),
        }));

        const newImageFiles = this.imageFileService.getImages(
          Object.keys(newImagesFormData),
        );
        const newImagesMetadata: Omit<BaseImage, 'fileSize'>[] = newImageFiles.map(
          ({ id, filename }) => {
            const formData = newImagesFormData[id];

            return {
              id,
              filename,
              caption: formData.caption,
              album: formData.album,
              albumCover: formData.albumCover,
              albumOrdinality: formData.albumOrdinality,
              modificationInfo: creditEditor(user),
            };
          },
        );

        // New images upload one file per request (concurrency-bounded); existing
        // image edits go in a single file-less request, well under the body limit.
        const uploads = newImagesMetadata.length
          ? this.uploadNewImages(newImagesMetadata, newImageFiles)
          : null;

        const newImages$ = uploads
          ? uploads.results$.pipe(
              map(results => ({
                newImages: results.flatMap(result => result.images),
                failed: results.filter(result => !result.success).length,
              })),
            )
          : of({ newImages: [] as Image[], failed: 0 });

        const updatedImages$ = existingImages.length
          ? this.updateExistingImages(existingImages)
          : of({ updatedImages: [] as BaseImage[], failed: 0 });

        const result$ = forkJoin([newImages$, updatedImages$]).pipe(
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

        return merge(uploads?.progress$ ?? EMPTY, result$);
      }),
    );
  });

  deleteImage$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(ImagesActions.deleteImageRequested),
      mergeMap(({ image }) => {
        return this.imagesApiService.deleteImage(image.id).pipe(
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

  // A new image's file goes when its draft does, whether saved, removed or discarded
  deleteFilesOfDroppedDrafts$ = createEffect(
    () =>
      this.store.select(ImagesSelectors.selectNewImagesFormData).pipe(
        map(newImagesFormData => Object.keys(newImagesFormData)),
        pairwise(),
        map(([before, after]) => before.filter(id => !after.includes(id))),
        filter(ids => ids.length > 0),
        tap(ids => this.imageFileService.deleteImages(ids)),
      ),
    { dispatch: false },
  );
}
