import {
  DialogService,
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
import { ImageExplorerComponent } from '@app/components/image-explorer/image-explorer.component';
import { ImageViewerComponent } from '@app/components/image-viewer/image-viewer.component';
import { ImageComponent } from '@app/components/image/image.component';
import { AdminControlsDirective } from '@app/directives/admin-controls.directive';
import { AdminButton, AdminControlsConfig, Image, InternalLink } from '@app/models';
import { DeletionService } from '@app/services';
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
  private readonly deletion = inject(DeletionService);
  private readonly dialogService = inject(DialogService);

  public readonly isAdmin = input.required<boolean>();
  public readonly photoImages = input.required<Image[]>();

  public readonly isLoading = input(false);
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
    this.isLoading() ? this.defaultSkeletonCovers : this.visibleAlbumCovers(),
  );

  public async onClickAlbumCover(album: string): Promise<void> {
    await this.dialogService.open(ImageViewerComponent, {
      inputs: {
        album,
        images: this.photoImages()
          .filter(image => image.album === album)
          .sort((a, b) => customSort(a, b, 'albumOrdinality', false, 'caption', false)),
        isAdmin: this.isAdmin(),
      },
    }).result;
  }

  public async onOpenImageExplorer(): Promise<void> {
    await this.dialogService.open(ImageExplorerComponent, {
      inputs: { selectable: false },
    }).result;
  }

  public getAdminControlsConfig(album: string): AdminControlsConfig {
    return {
      buttonSize: 34,
      deleteCb: () =>
        this.deletion.deleteAlbum(album, this.getAlbumPhotoCountText(album)),
      editPath: ['album', 'edit', album],
      editInNewTab: true,
      isEditDisabled: false,
      isDeleteDisabled: false,
      itemName: album,
    };
  }

  public getAlbumPhotoCountText(album: string): string {
    const photoCount = this.photoImages().filter(image => image.album === album).length;
    return `${photoCount} photo${photoCount === 1 ? '' : 's'}`;
  }
}
