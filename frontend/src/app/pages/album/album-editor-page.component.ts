import { CameraIconComponent, ShieldCheckIconComponent } from '@eagami/ui';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { Store } from '@ngrx/store';
import { Observable, combineLatest, of } from 'rxjs';
import { map, switchMap, tap } from 'rxjs/operators';

import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { AlbumFormComponent } from '@app/components/album-form/album-form.component';
import { FormSkeletonComponent } from '@app/components/form-skeleton/form-skeleton.component';
import { LinkListComponent } from '@app/components/link-list/link-list.component';
import { LoadFailedComponent } from '@app/components/load-failed/load-failed.component';
import { PageHeaderComponent } from '@app/components/page-header/page-header.component';
import {
  EditorPage,
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
  selector: 'lcc-images-editor-page',
  template: `
    @if (viewModel$ | async; as vm) {
      @switch (vm.status) {
        @case ('loaded') {
          <lcc-page-header
            [hasUnsavedChanges]="vm.hasUnsavedChanges"
            [heading]="vm.pageHeading"
            [icon]="adminIcon">
          </lcc-page-header>

          <lcc-album-form
            [album]="vm.album"
            [existingAlbums]="vm.existingAlbums"
            [hasUnsavedChanges]="vm.hasUnsavedChanges"
            [imageEntities]="vm.imageEntities"
            [newImagesFormData]="vm.newImagesFormData"
            (cancel)="onCancel()"
            (change)="onChange($event.multipleFormData)"
            (fileActionFail)="onFileActionFail($event)"
            (removeNewImage)="onRemoveNewImage($event)"
            (restore)="onRestore($event)">
          </lcc-album-form>
        }
        @case ('failed') {
          <lcc-load-failed
            title="Unable to load this album"
            (retry)="onRetry()" />
        }
        @default {
          <lcc-form-skeleton [fieldCount]="4" />
        }
      }

      <lcc-link-list [links]="[photoGalleryLink]"></lcc-link-list>
    }
  `,
  imports: [
    AlbumFormComponent,
    CommonModule,
    FormSkeletonComponent,
    LinkListComponent,
    LoadFailedComponent,
    PageHeaderComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AlbumEditorPageComponent implements EditorPage, OnInit {
  protected readonly adminIcon = ShieldCheckIconComponent;

  public readonly entity = 'album';
  public readonly photoGalleryLink: InternalLink = {
    text: 'Go to Photo Gallery',
    internalPath: 'photo-gallery',
    icon: CameraIconComponent,
  };
  public viewModel$?: Observable<{
    album: string | null;
    existingAlbums: string[];
    hasUnsavedChanges: boolean;
    imageEntities: { image: Image; formData: ImageFormData }[];
    newImagesFormData: Record<string, ImageFormData>;
    pageHeading: string;
    status: LoadStatus;
  }>;

  constructor(
    private readonly activatedRoute: ActivatedRoute,
    private readonly metaAndTitleService: MetaAndTitleService,
    private readonly store: Store,
  ) {}

  public ngOnInit(): void {
    this.viewModel$ = this.activatedRoute.params.pipe(
      untilDestroyed(this),
      map(params => (params['album'] ?? null) as string | null),
      switchMap(album =>
        combineLatest([
          of(album),
          this.store.select(ImagesSelectors.selectImageEntitiesByAlbum(album)),
          this.store.select(ImagesSelectors.selectNewImagesFormData),
          this.store.select(ImagesSelectors.selectAllExistingAlbums),
          this.store.select(ImagesSelectors.selectAlbumHasUnsavedChanges(album)),
          album
            ? this.store.select(ImagesSelectors.selectMetadataStatus)
            : of<LoadStatus>('loaded'),
        ]),
      ),
      map(
        ([
          album,
          imageEntities,
          newImagesFormData,
          existingAlbums,
          hasUnsavedChanges,
          status,
        ]) => ({
          album,
          existingAlbums,
          hasUnsavedChanges,
          imageEntities,
          newImagesFormData,
          pageHeading: album ? `Edit ${album}` : 'Create an album',
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

  public onChange(multipleFormData?: (Partial<ImageFormData> & { id: string })[]): void {
    if (!multipleFormData) {
      return;
    }

    this.store.dispatch(ImagesActions.formDataChanged({ multipleFormData }));
  }

  public onFileActionFail(error: LccError): void {
    this.store.dispatch(ImagesActions.imageFileActionFailed({ error }));
  }

  public onRemoveNewImage(imageId: string): void {
    this.store.dispatch(ImagesActions.newImageRemoved({ imageId }));
  }

  public onRetry(): void {
    this.store.dispatch(ImagesActions.fetchAllImagesMetadataRequested());
  }

  public onRestore(album: string | null): void {
    this.store.dispatch(ImagesActions.albumFormDataRestored({ album }));
  }
}
