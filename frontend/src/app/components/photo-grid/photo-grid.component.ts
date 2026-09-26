import {
  ImageSearchIconComponent,
  PlusCircleIconComponent,
  SkeletonComponent,
} from '@eagami/ui';

import { UpperCasePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core';

import { AdminToolbarComponent } from '@app/components/admin-toolbar/admin-toolbar.component';
import { BasicDialogComponent } from '@app/components/basic-dialog/basic-dialog.component';
import { ImageExplorerComponent } from '@app/components/image-explorer/image-explorer.component';
import { ImageViewerComponent } from '@app/components/image-viewer/image-viewer.component';
import { ImageComponent } from '@app/components/image/image.component';
import { AdminControlsDirective } from '@app/directives/admin-controls.directive';
import {
  AdminButton,
  AdminControlsConfig,
  BasicDialogResult,
  Dialog,
  Id,
  Image,
  InternalLink,
} from '@app/models';
import { DialogService, StoreRequestService } from '@app/services';
import { ImagesActions } from '@app/store/images';
import { customSort } from '@app/utils';

@Component({
  selector: 'lcc-photo-grid',
  templateUrl: './photo-grid.component.html',
  styleUrl: './photo-grid.component.scss',
  imports: [
    AdminControlsDirective,
    AdminToolbarComponent,
    ImageComponent,
    SkeletonComponent,
    UpperCasePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PhotoGridComponent {
  private readonly dialogService = inject(DialogService);
  private readonly storeRequests = inject(StoreRequestService);

  public readonly isAdmin = input.required<boolean>();
  public readonly photoImages = input.required<Image[]>();

  public readonly isLoading = input<boolean>();
  public readonly maxAlbums = input<number>();

  private readonly defaultSkeletonCovers: Image[] = Array.from({ length: 20 }, () => ({
    ...({} as Image),
    id: '',
    album: '',
  }));

  public readonly openImageExplorerButton: AdminButton = {
    id: 'open-image-explorer',
    tooltip: 'Open image explorer',
    icon: ImageSearchIconComponent,
    action: () => this.onOpenImageExplorer(),
  };

  public readonly addImageLink: InternalLink = {
    internalPath: ['image', 'add'],
    text: 'Add an image',
    icon: PlusCircleIconComponent,
  };

  public readonly createAlbumLink: InternalLink = {
    internalPath: ['album', 'add'],
    text: 'Create an album',
    icon: PlusCircleIconComponent,
  };

  public readonly showSkeleton = computed(() => !!this.isLoading());

  public readonly visibleAlbumCovers = computed<Image[]>(() => {
    const covers = this.photoImages()
      .filter(image => image.albumCover)
      .map(image => ({
        ...image,
        mainWidth: image.mainWidth || 300,
        mainHeight: image.mainHeight || 300,
        caption: image.caption || 'Loading...',
      }));
    const maxAlbums = this.maxAlbums();

    return maxAlbums != null ? covers.slice(0, maxAlbums) : covers;
  });

  public readonly displayCovers = computed<Image[]>(() =>
    this.showSkeleton() ? this.defaultSkeletonCovers : this.visibleAlbumCovers(),
  );

  public async onClickAlbumCover(album: string): Promise<void> {
    await this.dialogService.open<ImageViewerComponent, null>({
      componentType: ImageViewerComponent,
      isModal: true,
      inputs: {
        album,
        images: this.photoImages()
          .filter(image => image.album === album)
          .sort((a, b) => customSort(a, b, 'albumOrdinality', false, 'caption', false)),
        isAdmin: this.isAdmin(),
      },
    });
  }

  public async onOpenImageExplorer(): Promise<void> {
    await this.dialogService.open<ImageExplorerComponent, Id>({
      componentType: ImageExplorerComponent,
      inputs: { selectable: false },
      isModal: true,
    });
  }

  public getAdminControlsConfig(album: string): AdminControlsConfig {
    return {
      buttonSize: 34,
      deleteCb: () => this.onDeleteAlbum(album),
      editPath: ['album', 'edit', album],
      editInNewTab: true,
      isEditDisabled: false,
      isDeleteDisabled: false,
      itemName: album,
    };
  }

  public async onDeleteAlbum(album: string): Promise<void> {
    const dialog: Dialog = {
      title: 'Confirm',
      body: `Delete ${album} and its ${this.getAlbumPhotoCountText(album)}?`,
      confirmButtonText: 'Delete',
      confirmButtonType: 'warning',
      confirmAction: () =>
        this.storeRequests.dispatch(ImagesActions.deleteAlbumRequested({ album }), [
          ImagesActions.deleteAlbumSucceeded,
          ImagesActions.deleteAlbumFailed,
        ]),
    };

    await this.dialogService.open<BasicDialogComponent, BasicDialogResult>({
      componentType: BasicDialogComponent,
      inputs: { dialog },
      isModal: true,
    });
  }

  public getAlbumPhotoCountText(album: string): string {
    const photoCount = this.photoImages().filter(image => image.album === album).length;
    return `${photoCount} photo${photoCount === 1 ? '' : 's'}`;
  }
}
