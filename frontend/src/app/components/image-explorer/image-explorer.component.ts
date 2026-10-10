import {
  DialogComponent,
  DialogRef,
  EmptyStateComponent,
  FilterXIconComponent,
  InputComponent,
  PaginatorComponent,
  PaginatorState,
  PlusCircleIconComponent,
  SearchIconComponent,
  SkeletonComponent,
} from '@eagami/ui';
import { Store } from '@ngrx/store';
import { Observable, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';

import { CdkScrollableModule } from '@angular/cdk/scrolling';
import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  inject,
  input,
} from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

import { AdminToolbarComponent } from '@app/components/admin-toolbar/admin-toolbar.component';
import { ImageComponent } from '@app/components/image/image.component';
import { LoadFailedComponent } from '@app/components/load-failed/load-failed.component';
import { TextSkeletonComponent } from '@app/components/text-skeleton/text-skeleton.component';
import { PAGE_SIZES } from '@app/constants/filters';
import { AdminControlsDirective } from '@app/directives/admin-controls.directive';
import {
  AdminControlsConfig,
  DataPaginationOptions,
  Id,
  Image,
  InternalLink,
  LoadStatus,
} from '@app/models';
import { FormatBytesPipe, FormatDatePipe, HighlightPipe } from '@app/pipes';
import { DeletionService } from '@app/services';
import * as ImagesActions from '@app/store/images/images.actions';
import * as ImagesSelectors from '@app/store/images/images.selectors';
import { bindSearchControl, pageRowCount } from '@app/utils';

@Component({
  selector: 'lcc-image-explorer',
  templateUrl: './image-explorer.component.html',
  styleUrl: './image-explorer.component.scss',
  imports: [
    AdminControlsDirective,
    AdminToolbarComponent,
    CdkScrollableModule,
    CommonModule,
    DialogComponent,
    EmptyStateComponent,
    FormatBytesPipe,
    FormatDatePipe,
    HighlightPipe,
    ImageComponent,
    InputComponent,
    LoadFailedComponent,
    PaginatorComponent,
    ReactiveFormsModule,
    SkeletonComponent,
    TextSkeletonComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImageExplorerComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  protected readonly dialogRef = inject<DialogRef<Id>>(DialogRef);
  private readonly deletion = inject(DeletionService);
  private readonly store = inject(Store);

  public readonly selectable = input<boolean>(true);

  public viewModel$?: Observable<{
    images: Image[];
    filteredCount: number | null;
    isLoading: boolean;
    options: DataPaginationOptions<Image>;
    skeletonCards: number[];
    status: LoadStatus;
  }>;

  public readonly addImageLink: InternalLink = {
    internalPath: ['image', 'add'],
    text: 'Add an image',
    icon: PlusCircleIconComponent,
  };

  protected readonly searchIcon = SearchIconComponent;
  protected readonly emptyIcon = FilterXIconComponent;
  protected readonly searchControl = new FormControl('', { nonNullable: true });
  protected readonly pageSizes = PAGE_SIZES;

  public ngOnInit(): void {
    this.store.dispatch(ImagesActions.fetchFilteredThumbnailsRequested());

    bindSearchControl(
      this.searchControl,
      this.store.select(ImagesSelectors.selectOptions),
      options => this.onOptionsChange(options),
      this.destroyRef,
    );

    this.viewModel$ = combineLatest([
      this.store.select(ImagesSelectors.selectFilteredImages),
      this.store.select(ImagesSelectors.selectFilteredCount),
      this.store.select(ImagesSelectors.selectOptions),
      this.store.select(ImagesSelectors.selectFilteredThumbnailsStatus),
      this.store.select(ImagesSelectors.selectIsFetchingFiltered),
    ]).pipe(
      map(([images, filteredCount, options, status, isFetching]) => ({
        images,
        filteredCount,
        isLoading: status === 'loading' || isFetching,
        options,
        skeletonCards: Array.from(
          { length: pageRowCount(options.pageSize, filteredCount ?? PAGE_SIZES[0]) },
          (_, index) => index,
        ),
        status,
      })),
    );
  }

  public getAdminControlsConfig(image: Image): AdminControlsConfig {
    return {
      buttonSize: 34,
      deleteCb: () => this.deletion.deleteImage(image),
      editPath: ['image', 'edit', image.id.split('-')[0]],
      editInNewTab: true,
      isDeleteDisabled: !!image?.articleAppearances,
      deleteDisabledReason: 'Image cannot be deleted while it is used in an article',
      itemName: image.filename,
    };
  }

  public onRetry(): void {
    this.store.dispatch(ImagesActions.fetchFilteredThumbnailsRequested());
  }

  public onOptionsChange(options: DataPaginationOptions<Image>): void {
    this.store.dispatch(ImagesActions.paginationOptionsChanged({ options }));
  }

  public onPageChanged(
    { page, pageSize }: PaginatorState,
    options: DataPaginationOptions<Image>,
  ): void {
    this.onOptionsChange({ ...options, page, pageSize });
  }
}
