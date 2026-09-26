import { ChevronLeftIconComponent, ChevronRightIconComponent } from '@eagami/ui';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { Action, Store } from '@ngrx/store';
import { BehaviorSubject, Observable, from, timer } from 'rxjs';
import { concatMap, map, switchMap, take } from 'rxjs/operators';

import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  Renderer2,
  inject,
  input,
  output,
} from '@angular/core';

import { BasicDialogComponent } from '@app/components/basic-dialog/basic-dialog.component';
import { ImageComponent } from '@app/components/image/image.component';
import { AdminControlsDirective } from '@app/directives/admin-controls.directive';
import { TooltipDirective } from '@app/directives/tooltip.directive';
import {
  AdminControlsConfig,
  BasicDialogResult,
  Dialog,
  DialogOutput,
  Id,
  Image,
} from '@app/models';
import { AdminControlsService, DialogService, StoreRequestService } from '@app/services';
import { ImagesActions, ImagesSelectors } from '@app/store/images';
import { isPresignedUrlExpired } from '@app/utils';

@UntilDestroy()
@Component({
  selector: 'lcc-image-viewer',
  templateUrl: './image-viewer.component.html',
  styleUrl: './image-viewer.component.scss',
  imports: [
    AdminControlsDirective,
    ChevronLeftIconComponent,
    ChevronRightIconComponent,
    CommonModule,
    ImageComponent,
    TooltipDirective,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImageViewerComponent
  implements OnInit, AfterViewInit, OnDestroy, DialogOutput<null>
{
  private readonly dialogService = inject(DialogService);
  private readonly renderer = inject(Renderer2);
  private readonly store = inject(Store);

  readonly album = input.required<string>();
  readonly images = input.required<Image[]>();
  readonly isAdmin = input.required<boolean>();

  public readonly dialogResult = output<null | 'close'>();

  public currentImage$!: Observable<Image | null>;
  public displayedCaption: string = '';
  public isNextImageButtonActive = false;
  public isPreviousImageButtonActive = false;

  public get index(): number {
    return this.indexSubject.getValue();
  }

  public get imageId(): Id {
    return this.images()[this.index].id;
  }

  private indexSubject = new BehaviorSubject<number>(0);

  private readonly adminControls = inject(AdminControlsService);
  private readonly storeRequests = inject(StoreRequestService);

  private keydownListener?: () => void;
  private keyupListener?: () => void;

  public ngOnInit(): void {
    this.currentImage$ = this.indexSubject.asObservable().pipe(
      untilDestroyed(this),
      switchMap(index => {
        this.fetchImage(index);
        return this.store.select(ImagesSelectors.selectImageById(this.imageId));
      }),
    );

    this.prefetchAdjacentImages();
  }

  public ngAfterViewInit(): void {
    setTimeout(() => this.initKeyListeners());
  }

  public ngOnDestroy(): void {
    this.keydownListener?.();
    this.keyupListener?.();
  }

  public onPreviousImage(): void {
    this.adminControls.close();
    const newIndex = this.index > 0 ? this.index - 1 : this.images().length - 1;
    this.indexSubject.next(newIndex);
  }

  public onNextImage(): void {
    this.adminControls.close();
    const newIndex = this.index < this.images().length - 1 ? this.index + 1 : 0;
    this.indexSubject.next(newIndex);
  }

  public getAdminControlsConfig(image: Image): AdminControlsConfig {
    return {
      buttonSize: 34,
      deleteCb: () => this.onDeleteImage(image),
      editPath: ['image', 'edit', image.id],
      editInNewTab: true,
      isDeleteDisabled: !!image?.articleAppearances,
      deleteDisabledReason: 'Image cannot be deleted while it is used in an article',
      itemName: image.filename,
    };
  }

  public async onDeleteImage(image: Image): Promise<void> {
    let outcome: Action | undefined;
    const dialog: Dialog = {
      title: 'Confirm',
      body: `Delete ${image.filename}?`,
      confirmButtonText: 'Delete',
      confirmButtonType: 'warning',
      confirmAction: async () => {
        outcome = await this.storeRequests.dispatch(
          ImagesActions.deleteImageRequested({ image }),
          [ImagesActions.deleteImageSucceeded, ImagesActions.deleteImageFailed],
        );
      },
    };

    await this.dialogService.open<BasicDialogComponent, BasicDialogResult>({
      componentType: BasicDialogComponent,
      inputs: { dialog },
      isModal: true,
    });

    if (outcome?.type === ImagesActions.deleteImageSucceeded.type) {
      this.dialogResult.emit(null);
    }
  }

  private prefetchAdjacentImages(): void {
    if (this.images().length <= 1) {
      return;
    }

    // Build a list of indices to prefetch, starting with the immediate
    // neighbours (next, then previous) and then alternating outward.
    const indicesToPrefetch: number[] = [1];

    const images = this.images();
    if (this.images().length > 2) {
      indicesToPrefetch.push(images.length - 1);
    }

    for (let i = 2; i <= Math.floor(images.length / 2); i++) {
      indicesToPrefetch.push(i);
      if (i !== images.length - i) {
        indicesToPrefetch.push(images.length - i);
      }
    }

    // Stagger prefetch requests by 1s each so we don't swamp the browser, and
    // cancel the whole stream if the viewer is destroyed mid-prefetch.
    from(indicesToPrefetch)
      .pipe(
        concatMap(index => timer(1000).pipe(map(() => index))),
        untilDestroyed(this),
      )
      .subscribe(index => this.fetchImage(index, true));
  }

  private fetchImage(index: number, isPrefetch = false): void {
    if (index < 0 || index >= this.images().length) {
      return;
    }

    const imageId = this.images()[index].id;

    this.store
      .select(ImagesSelectors.selectImageById(imageId))
      .pipe(take(1))
      .subscribe(image => {
        if (!image?.mainUrl || isPresignedUrlExpired(image.urlExpirationDate)) {
          if (isPrefetch) {
            this.store.dispatch(
              ImagesActions.fetchMainImageInBackgroundRequested({ imageId }),
            );
          } else {
            this.store.dispatch(ImagesActions.fetchMainImageRequested({ imageId }));
          }
        }
      });
  }

  private initKeyListeners(): void {
    this.keydownListener = this.renderer.listen(
      'document',
      'keydown',
      (event: KeyboardEvent) => {
        const navKeys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '];
        if (!navKeys.includes(event.key)) {
          return;
        }

        event.preventDefault();
        event.stopPropagation();

        if (
          event.key === 'ArrowLeft' &&
          this.images().length > 1 &&
          !this.isPreviousImageButtonActive
        ) {
          this.isPreviousImageButtonActive = true;
          this.onPreviousImage();
        } else if (
          (event.key === 'ArrowRight' || event.key === ' ') &&
          this.images().length > 1 &&
          !this.isNextImageButtonActive
        ) {
          this.isNextImageButtonActive = true;
          this.onNextImage();
        }
      },
    );

    this.keyupListener = this.renderer.listen(
      'document',
      'keyup',
      (event: KeyboardEvent) => {
        if (event.key === 'ArrowLeft' && this.images().length > 1) {
          this.isPreviousImageButtonActive = false;
        } else if (
          (event.key === 'ArrowRight' || event.key === ' ') &&
          this.images().length > 1
        ) {
          this.isNextImageButtonActive = false;
        }
      },
    );
  }
}
