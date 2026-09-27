import {
  EmptyStateComponent,
  FilterXIconComponent,
  InputComponent,
  PaginatorComponent,
  PaginatorState,
  PlusCircleIconComponent,
  SearchIconComponent,
  SkeletonComponent,
} from '@eagami/ui';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { Store } from '@ngrx/store';
import { Observable, combineLatest } from 'rxjs';
import { debounceTime, distinctUntilChanged, map, withLatestFrom } from 'rxjs/operators';

import { CdkScrollable, CdkScrollableModule } from '@angular/cdk/scrolling';
import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  input,
  output,
} from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

import { AdminToolbarComponent } from '@app/components/admin-toolbar/admin-toolbar.component';
import { BasicDialogComponent } from '@app/components/basic-dialog/basic-dialog.component';
import { ImageComponent } from '@app/components/image/image.component';
import { LoadFailedComponent } from '@app/components/load-failed/load-failed.component';
import { TextSkeletonComponent } from '@app/components/text-skeleton/text-skeleton.component';
import { PAGE_SIZES, SEARCH_DEBOUNCE } from '@app/constants/filters';
import { AdminControlsDirective } from '@app/directives/admin-controls.directive';
import {
  AdminControlsConfig,
  BasicDialogResult,
  DataPaginationOptions,
  Dialog,
  DialogOutput,
  Id,
  Image,
  InternalLink,
  LoadStatus,
} from '@app/models';
import { FormatBytesPipe, FormatDatePipe, HighlightPipe } from '@app/pipes';
import { DialogService, StoreRequestService } from '@app/services';
import * as ImagesActions from '@app/store/images/images.actions';
import * as ImagesSelectors from '@app/store/images/images.selectors';
import { pageRowCount } from '@app/utils';

@UntilDestroy()
@Component({
  selector: 'lcc-image-explorer',
  templateUrl: './image-explorer.component.html',
  styleUrl: './image-explorer.component.scss',
  imports: [
    AdminControlsDirective,
    AdminToolbarComponent,
    CdkScrollableModule,
    CommonModule,
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
  hostDirectives: [CdkScrollable],
})
export class ImageExplorerComponent implements OnInit, DialogOutput<Id> {
  private readonly dialogService = inject(DialogService);
  private readonly store = inject(Store);

  public readonly selectable = input<boolean>(true);

  public readonly dialogResult = output<Id | 'close'>();

  public viewModel$?: Observable<{
    images: Image[];
    filteredCount: number | null;
    isLoading: boolean;
    options: DataPaginationOptions<Image>;
    skeletonCards: number[];
    status: LoadStatus;
    totalCount: number;
  }>;

  public readonly addImageLink: InternalLink = {
    internalPath: ['image', 'add'],
    text: 'Add an image',
    icon: PlusCircleIconComponent,
  };

  private readonly storeRequests = inject(StoreRequestService);

  protected readonly searchIcon = SearchIconComponent;
  protected readonly emptyIcon = FilterXIconComponent;
  protected readonly searchControl = new FormControl('', { nonNullable: true });
  protected readonly pageSizes = PAGE_SIZES;

  public ngOnInit(): void {
    this.store.dispatch(ImagesActions.fetchFilteredThumbnailsRequested());

    // The box shows the search in force, wherever it was set, and sends new text on a pause
    this.store
      .select(ImagesSelectors.selectOptions)
      .pipe(untilDestroyed(this))
      .subscribe(({ search }) => {
        if (this.searchControl.value !== search) {
          this.searchControl.setValue(search, { emitEvent: false });
        }
      });
    this.searchControl.valueChanges
      .pipe(
        debounceTime(SEARCH_DEBOUNCE),
        distinctUntilChanged(),
        withLatestFrom(this.store.select(ImagesSelectors.selectOptions)),
        untilDestroyed(this),
      )
      .subscribe(([search, options]) =>
        this.onOptionsChange({ ...options, search, page: 1 }),
      );

    this.viewModel$ = combineLatest([
      this.store.select(ImagesSelectors.selectFilteredImages),
      this.store.select(ImagesSelectors.selectFilteredCount),
      this.store.select(ImagesSelectors.selectOptions),
      this.store.select(ImagesSelectors.selectTotalCount),
      this.store.select(ImagesSelectors.selectFilteredThumbnailsStatus),
      this.store.select(ImagesSelectors.selectIsFetchingFiltered),
    ]).pipe(
      untilDestroyed(this),
      map(([images, filteredCount, options, totalCount, status, isFetching]) => ({
        images,
        filteredCount,
        isLoading: status === 'loading' || isFetching,
        options,
        skeletonCards: Array.from(
          { length: pageRowCount(options.pageSize, filteredCount ?? PAGE_SIZES[0]) },
          (_, index) => index,
        ),
        status,
        totalCount,
      })),
    );
  }

  public getAdminControlsConfig(image: Image): AdminControlsConfig {
    return {
      buttonSize: 34,
      deleteCb: () => this.onDeleteImage(image),
      editPath: ['image', 'edit', image.id.split('-')[0]],
      editInNewTab: true,
      isDeleteDisabled: !!image?.articleAppearances,
      deleteDisabledReason: 'Image cannot be delete while it is used in an article',
      itemName: image.filename,
    };
  }

  public async onDeleteImage(image: Image): Promise<void> {
    const dialog: Dialog = {
      title: 'Confirm',
      body: `Delete ${image.filename}?`,
      confirmButtonText: 'Delete',
      confirmButtonType: 'warning',
      confirmAction: () =>
        this.storeRequests.dispatch(ImagesActions.deleteImageRequested({ image }), [
          ImagesActions.deleteImageSucceeded,
          ImagesActions.deleteImageFailed,
        ]),
    };

    await this.dialogService.open<BasicDialogComponent, BasicDialogResult>({
      componentType: BasicDialogComponent,
      inputs: { dialog },
      isModal: true,
    });
  }

  public onRetry(): void {
    this.store.dispatch(ImagesActions.fetchFilteredThumbnailsRequested());
  }

  public onOptionsChange(options: DataPaginationOptions<Image>, fetch = true): void {
    this.store.dispatch(ImagesActions.paginationOptionsChanged({ options, fetch }));
  }

  public onPageChanged(
    { page, pageSize }: PaginatorState,
    options: DataPaginationOptions<Image>,
  ): void {
    this.onOptionsChange({ ...options, page, pageSize });
  }
}
