import { CameraIconComponent, ShieldCheckIconComponent } from '@eagami/ui';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { Store } from '@ngrx/store';
import { Observable, combineLatest, of } from 'rxjs';
import { map, switchMap, tap } from 'rxjs/operators';

import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { AlbumFormComponent } from '@app/components/album-form/album-form.component';
import { LinkListComponent } from '@app/components/link-list/link-list.component';
import { PageHeaderComponent } from '@app/components/page-header/page-header.component';
import { EditorPage, Image, ImageFormData, InternalLink, LccError } from '@app/models';
import { MetaAndTitleService } from '@app/services';
import { ImagesActions, ImagesSelectors } from '@app/store/images';

@UntilDestroy()
@Component({
  selector: 'lcc-images-editor-page',
  template: `
    @if (viewModel$ | async; as vm) {
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
        (requestAddImages)="onRequestAddImages()"
        (requestUpdateAlbum)="onRequestUpdateAlbum($event)"
        (restore)="onRestore($event)">
      </lcc-album-form>

      <lcc-link-list [links]="[photoGalleryLink]"></lcc-link-list>
    }
  `,
  imports: [AlbumFormComponent, CommonModule, LinkListComponent, PageHeaderComponent],
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
        ]),
      ),
      map(
        ([
          album,
          imageEntities,
          newImagesFormData,
          existingAlbums,
          hasUnsavedChanges,
        ]) => ({
          album,
          existingAlbums,
          hasUnsavedChanges,
          imageEntities,
          newImagesFormData,
          pageHeading: album ? `Edit ${album}` : 'Create an album',
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

  public onRequestAddImages(): void {
    this.store.dispatch(ImagesActions.addImagesRequested());
  }

  public onRequestUpdateAlbum(album: string): void {
    this.store.dispatch(ImagesActions.updateAlbumRequested({ album }));
  }

  public onRestore(album: string | null): void {
    this.store.dispatch(ImagesActions.albumFormDataRestored({ album }));
  }
}
