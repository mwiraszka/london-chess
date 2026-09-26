import { CameraIconComponent, ShieldCheckIconComponent } from '@eagami/ui';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { Store } from '@ngrx/store';
import { Observable, combineLatest, of } from 'rxjs';
import { map, switchMap, tap } from 'rxjs/operators';

import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { FormSkeletonComponent } from '@app/components/form-skeleton/form-skeleton.component';
import { ImageFormComponent } from '@app/components/image-form/image-form.component';
import { LinkListComponent } from '@app/components/link-list/link-list.component';
import { LoadFailedComponent } from '@app/components/load-failed/load-failed.component';
import { PageHeaderComponent } from '@app/components/page-header/page-header.component';
import {
  EditorPage,
  Id,
  Image,
  ImageFormData,
  InternalLink,
  LccError,
  LoadStatus,
} from '@app/models';
import { MetaAndTitleService } from '@app/services';
import { ImagesActions, ImagesSelectors } from '@app/store/images';

@UntilDestroy()
@Component({
  selector: 'lcc-image-editor-page',
  template: `
    @if (viewModel$ | async; as vm) {
      @switch (vm.status) {
        @case ('loaded') {
          <lcc-page-header
            [hasUnsavedChanges]="vm.hasUnsavedChanges"
            [icon]="adminIcon"
            [heading]="vm.pageHeading">
          </lcc-page-header>

          <lcc-image-form
            [existingAlbums]="vm.existingAlbums"
            [hasUnsavedChanges]="vm.hasUnsavedChanges"
            [imageEntity]="vm.imageEntity"
            [newImageFormData]="vm.newImageFormData"
            (cancel)="onCancel()"
            (change)="onChange($event.multipleFormData)"
            (fileActionFail)="onFileActionFail($event)"
            (requestFetchMainImage)="onRequestFetchMainImage($event)"
            (restore)="onRestore($event)">
          </lcc-image-form>
        }
        @case ('failed') {
          <lcc-load-failed
            title="Unable to load this image"
            (retry)="onRetry(vm.imageId)" />
        }
        @default {
          <lcc-form-skeleton [fieldCount]="4" />
        }
      }

      <lcc-link-list [links]="[photoGalleryPageLink]"></lcc-link-list>
    }
  `,
  imports: [
    CommonModule,
    FormSkeletonComponent,
    ImageFormComponent,
    LinkListComponent,
    LoadFailedComponent,
    PageHeaderComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImageEditorPageComponent implements EditorPage, OnInit {
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly metaAndTitleService = inject(MetaAndTitleService);
  private readonly store = inject(Store);

  protected readonly adminIcon = ShieldCheckIconComponent;

  public readonly entity = 'image';
  public readonly photoGalleryPageLink: InternalLink = {
    text: 'Go to Photo Gallery',
    internalPath: 'photo-gallery',
    icon: CameraIconComponent,
  };
  public viewModel$?: Observable<{
    existingAlbums: string[];
    hasUnsavedChanges: boolean;
    imageEntity: { image: Image; formData: ImageFormData } | null;
    imageId: Id | null;
    newImageFormData: ImageFormData | null;
    pageHeading: string;
    status: LoadStatus;
  }>;

  public ngOnInit(): void {
    this.viewModel$ = this.activatedRoute.params.pipe(
      untilDestroyed(this),
      map(params => (params['image_id'] ?? null) as string | null),
      switchMap(imageId =>
        combineLatest([
          of(imageId),
          this.store.select(ImagesSelectors.selectImageEntityById(imageId)),
          this.store.select(ImagesSelectors.selectNewImageFormData),
          this.store.select(ImagesSelectors.selectAllExistingAlbums),
          this.store.select(ImagesSelectors.selectImageHasUnsavedChanges(imageId)),
          imageId
            ? this.store.select(ImagesSelectors.selectImageStatus(imageId))
            : of<LoadStatus>('loaded'),
        ]),
      ),
      map(
        ([
          imageId,
          imageEntity,
          newImageFormData,
          existingAlbums,
          hasUnsavedChanges,
          status,
        ]) => ({
          existingAlbums,
          newImageFormData,
          hasUnsavedChanges,
          imageEntity,
          imageId,
          pageHeading: imageEntity
            ? `Edit ${imageEntity.image.filename}`
            : 'Add an image',
          status,
        }),
      ),
      tap(viewModel => {
        this.metaAndTitleService.updateTitle(viewModel.pageHeading);
        this.metaAndTitleService.updateDescription(
          `${viewModel.pageHeading} for the London Chess Club.`,
        );
      }),
    );
  }

  public onCancel(): void {
    this.store.dispatch(ImagesActions.cancelSelected());
  }

  public onChange(multipleFormData: (Partial<ImageFormData> & { id: string })[]): void {
    this.store.dispatch(ImagesActions.formDataChanged({ multipleFormData }));
  }

  public onFileActionFail(error: LccError): void {
    this.store.dispatch(ImagesActions.imageFileActionFailed({ error }));
  }

  public onRequestFetchMainImage(imageId: string): void {
    this.store.dispatch(ImagesActions.fetchMainImageRequested({ imageId }));
  }

  public onRetry(imageId: Id | null): void {
    if (imageId) {
      this.store.dispatch(ImagesActions.fetchMainImageRequested({ imageId }));
    }
  }

  public onRestore(imageId: string): void {
    this.store.dispatch(ImagesActions.imageFormDataRestored({ imageId }));
  }
}
