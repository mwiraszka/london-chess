import { CameraIconComponent } from '@eagami/ui';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { Store } from '@ngrx/store';
import { Observable, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';

import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';

import { PageHeaderComponent } from '@app/components/page-header/page-header.component';
import { PhotoGridComponent } from '@app/components/photo-grid/photo-grid.component';
import { Image } from '@app/models';
import { MetaAndTitleService } from '@app/services';
import { AuthSelectors } from '@app/store/auth';
import { ImagesActions, ImagesSelectors } from '@app/store/images';

@UntilDestroy()
@Component({
  selector: 'lcc-photo-gallery-page',
  template: `
    @if (viewModel$ | async; as vm) {
      <lcc-page-header
        heading="Photo Gallery"
        [icon]="pageIcon">
      </lcc-page-header>

      <lcc-photo-grid
        [isAdmin]="vm.isAdmin"
        [isLoading]="vm.isLoading"
        [photoImages]="vm.photoImages"
        (requestDeleteAlbum)="onRequestDeleteAlbum($event)">
      </lcc-photo-grid>
    }
  `,
  imports: [CommonModule, PageHeaderComponent, PhotoGridComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PhotoGalleryPageComponent implements OnInit {
  protected readonly pageIcon = CameraIconComponent;

  public viewModel$?: Observable<{
    isAdmin: boolean;
    isLoading: boolean;
    photoImages: Image[];
  }>;

  constructor(
    private readonly metaAndTitleService: MetaAndTitleService,
    private readonly store: Store,
  ) {}

  public ngOnInit(): void {
    this.metaAndTitleService.updateTitle('Photo Gallery');
    this.metaAndTitleService.updateDescription(
      'Browse through photos of our club events over the years.',
    );

    this.viewModel$ = combineLatest([
      this.store.select(AuthSelectors.selectIsAdmin),
      this.store.select(ImagesSelectors.selectPhotoImages),
      this.store.select(ImagesSelectors.selectLastMetadataFetch),
    ]).pipe(
      untilDestroyed(this),
      map(([isAdmin, photoImages, lastMetadataFetch]) => ({
        isAdmin,
        isLoading: lastMetadataFetch === null,
        photoImages,
      })),
    );
  }

  public onRequestDeleteAlbum(album: string): void {
    this.store.dispatch(ImagesActions.deleteAlbumRequested({ album }));
  }
}
