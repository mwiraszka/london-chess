import { PlusCircleIconComponent, SkeletonComponent } from '@eagami/ui';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { Store } from '@ngrx/store';
import { Observable, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';

import { CdkScrollable, CdkScrollableModule } from '@angular/cdk/scrolling';
import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
  inject,
} from '@angular/core';

import { AdminToolbarComponent } from '@app/components/admin-toolbar/admin-toolbar.component';
import { BasicDialogComponent } from '@app/components/basic-dialog/basic-dialog.component';
import { DataToolbarComponent } from '@app/components/data-toolbar/data-toolbar.component';
import { ImageComponent } from '@app/components/image/image.component';
import { LoadFailedComponent } from '@app/components/load-failed/load-failed.component';
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
    DataToolbarComponent,
    FormatBytesPipe,
    FormatDatePipe,
    HighlightPipe,
    ImageComponent,
    LoadFailedComponent,
    SkeletonComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  hostDirectives: [CdkScrollable],
})
export class ImageExplorerComponent implements OnInit, DialogOutput<Id> {
  @Input() public selectable: boolean = true;

  @Output() public dialogResult = new EventEmitter<Id | 'close'>();

  public viewModel$?: Observable<{
    images: Image[];
    filteredCount: number | null;
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

  constructor(
    private readonly dialogService: DialogService,
    private readonly store: Store,
  ) {}

  public ngOnInit(): void {
    this.store.dispatch(ImagesActions.fetchFilteredThumbnailsRequested());

    this.viewModel$ = combineLatest([
      this.store.select(ImagesSelectors.selectFilteredImages),
      this.store.select(ImagesSelectors.selectFilteredCount),
      this.store.select(ImagesSelectors.selectOptions),
      this.store.select(ImagesSelectors.selectTotalCount),
      this.store.select(ImagesSelectors.selectFilteredThumbnailsStatus),
    ]).pipe(
      untilDestroyed(this),
      map(([images, filteredCount, options, totalCount, status]) => ({
        images,
        filteredCount,
        options,
        // A page size of -1 shows every image, so the skeleton stops at a screenful
        skeletonCards: Array.from(
          { length: options.pageSize > 0 ? options.pageSize : 20 },
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
}
