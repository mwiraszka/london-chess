import { CameraIconComponent } from '@eagami/ui';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { Store } from '@ngrx/store';
import { Observable, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';

import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';

import { LoadFailedComponent } from '@app/components/load-failed/load-failed.component';
import { PageHeaderComponent } from '@app/components/page-header/page-header.component';
import { PhotoGridComponent } from '@app/components/photo-grid/photo-grid.component';
import { Image, LoadStatus } from '@app/models';
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

      @if (vm.status === 'failed') {
        <lcc-load-failed
          title="Unable to load photos"
          (retry)="onRetry()" />
      } @else {
        <lcc-photo-grid
          [isAdmin]="vm.isAdmin"
          [isLoading]="vm.status === 'loading'"
          [photoImages]="vm.photoImages">
        </lcc-photo-grid>
      }
    }
  `,
  imports: [CommonModule, LoadFailedComponent, PageHeaderComponent, PhotoGridComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PhotoGalleryPageComponent implements OnInit {
  private readonly metaAndTitleService = inject(MetaAndTitleService);
  private readonly store = inject(Store);

  protected readonly pageIcon = CameraIconComponent;

  public viewModel$?: Observable<{
    isAdmin: boolean;
    photoImages: Image[];
    status: LoadStatus;
  }>;

  public ngOnInit(): void {
    this.metaAndTitleService.updateTitle('Photo Gallery');
    this.metaAndTitleService.updateDescription(
      'Browse through photos of our club events over the years.',
    );

    this.viewModel$ = combineLatest([
      this.store.select(AuthSelectors.selectIsAdmin),
      this.store.select(ImagesSelectors.selectPhotoImages),
      this.store.select(ImagesSelectors.selectMetadataStatus),
    ]).pipe(
      untilDestroyed(this),
      map(([isAdmin, photoImages, status]) => ({ isAdmin, photoImages, status })),
    );
  }

  public onRetry(): void {
    this.store.dispatch(ImagesActions.fetchAllImagesMetadataRequested());
  }
}
