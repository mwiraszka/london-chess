import { CameraIconComponent, ShieldCheckIconComponent } from '@eagami/ui';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { Store } from '@ngrx/store';
import { Observable, combineLatest } from 'rxjs';
import { map, switchMap, tap } from 'rxjs/operators';

import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { ImageFormComponent } from '@app/components/image-form/image-form.component';
import { LinkListComponent } from '@app/components/link-list/link-list.component';
import { PageHeaderComponent } from '@app/components/page-header/page-header.component';
import { EditorPage, Image, ImageFormData, InternalLink } from '@app/models';
import { LccError } from '@app/models';
import { MetaAndTitleService } from '@app/services';
import { ImagesActions, ImagesSelectors } from '@app/store/images';

@UntilDestroy()
@Component({
  selector: 'lcc-image-editor-page',
  template: `
    @if (viewModel$ | async; as vm) {
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
        (requestAddImage)="onRequestAddImage($event)"
        (requestFetchMainImage)="onRequestFetchMainImage($event)"
        (requestUpdateImage)="onRequestUpdateImage($event)"
        (restore)="onRestore($event)">
      </lcc-image-form>

      <lcc-link-list [links]="[photoGalleryPageLink]"></lcc-link-list>
    }
  `,
  imports: [CommonModule, ImageFormComponent, LinkListComponent, PageHeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImageEditorPageComponent implements EditorPage, OnInit {
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
    newImageFormData: ImageFormData | null;
    pageHeading: string;
  }>;

  constructor(
    private readonly activatedRoute: ActivatedRoute,
    private readonly metaAndTitleService: MetaAndTitleService,
    private readonly store: Store,
  ) {}

  public ngOnInit(): void {
    this.viewModel$ = this.activatedRoute.params.pipe(
      untilDestroyed(this),
      map(params => (params['image_id'] ?? null) as string | null),
      switchMap(imageId =>
        combineLatest([
          this.store.select(ImagesSelectors.selectImageEntityById(imageId)),
          this.store.select(ImagesSelectors.selectNewImageFormData),
          this.store.select(ImagesSelectors.selectAllExistingAlbums),
          this.store.select(ImagesSelectors.selectImageHasUnsavedChanges(imageId)),
        ]),
      ),
      map(([imageEntity, newImageFormData, existingAlbums, hasUnsavedChanges]) => ({
        existingAlbums,
        newImageFormData,
        hasUnsavedChanges,
        imageEntity,
        pageHeading: imageEntity ? `Edit ${imageEntity.image.filename}` : 'Add an image',
      })),
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

  public onRequestAddImage(imageId: string): void {
    this.store.dispatch(ImagesActions.addImageRequested({ imageId }));
  }

  public onRequestFetchMainImage(imageId: string): void {
    this.store.dispatch(ImagesActions.fetchMainImageRequested({ imageId }));
  }

  public onRequestUpdateImage(imageId: string): void {
    this.store.dispatch(ImagesActions.updateImageRequested({ imageId }));
  }

  public onRestore(imageId: string): void {
    this.store.dispatch(ImagesActions.imageFormDataRestored({ imageId }));
  }
}
