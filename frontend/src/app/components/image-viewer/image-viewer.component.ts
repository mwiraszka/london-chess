import {
  ButtonComponent,
  ChevronLeftIconComponent,
  ChevronRightIconComponent,
  DialogComponent,
  DialogRef,
  TooltipDirective,
} from '@eagami/ui';
import { Store } from '@ngrx/store';
import { BehaviorSubject, EMPTY, Observable, Subject, from, merge, timer } from 'rxjs';
import { concatMap, distinctUntilChanged, map, switchMap, take } from 'rxjs/operators';

import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  OnInit,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { ImageComponent } from '@app/components/image/image.component';
import { AdminControlsDirective } from '@app/directives/admin-controls.directive';
import { AdminControlsConfig, Id, Image, Url } from '@app/models';
import {
  AdminControlsService,
  DeletionService,
  LoadedImagesService,
} from '@app/services';
import { ImagesActions, ImagesSelectors } from '@app/store/images';
import { isPresignedUrlExpired } from '@app/utils';

@Component({
  selector: 'lcc-image-viewer',
  templateUrl: './image-viewer.component.html',
  styleUrl: './image-viewer.component.scss',
  imports: [
    AdminControlsDirective,
    ButtonComponent,
    CommonModule,
    DialogComponent,
    ImageComponent,
    TooltipDirective,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImageViewerComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly dialogRef = inject(DialogRef);
  private readonly deletion = inject(DeletionService);
  private readonly store = inject(Store);

  readonly album = input.required<string>();
  readonly images = input.required<Image[]>();
  readonly isAdmin = input.required<boolean>();

  public currentImage$!: Observable<Image | null>;

  // The image on screen, which gives way to the one asked for only once it has loaded
  protected readonly shownImage = signal<Image | null>(null);
  protected readonly isEnlarged = signal(false);
  protected readonly displayedCaption = signal('');
  protected readonly isNextImageButtonActive = signal(false);
  protected readonly isPreviousImageButtonActive = signal(false);
  protected readonly nextIcon = ChevronRightIconComponent;
  protected readonly previousIcon = ChevronLeftIconComponent;

  public get index(): number {
    return this.indexSubject.getValue();
  }

  public get imageId(): Id {
    return this.images()[this.index].id;
  }

  private indexSubject = new BehaviorSubject<number>(0);

  private readonly adminControls = inject(AdminControlsService);
  private readonly loadedImages = inject(LoadedImagesService);
  private readonly enlargedDialog = viewChild<ElementRef<HTMLDialogElement>>('enlarged');

  private pendingImage: HTMLImageElement | null = null;
  private readonly loadedIndex$ = new Subject<number>();
  // Held so the browser keeps loading them
  private readonly preloadedImages = new Map<Url, HTMLImageElement>();

  public ngOnInit(): void {
    this.currentImage$ = this.indexSubject.asObservable().pipe(
      takeUntilDestroyed(this.destroyRef),
      switchMap(index => {
        this.fetchImage(index);
        return this.store.select(ImagesSelectors.selectImageById(this.imageId));
      }),
    );
    this.currentImage$.subscribe(image => this.show(image));

    this.prefetchAdjacentImages();
    this.preloadNeighbours();
    this.destroyRef.onDestroy(() => (this.pendingImage = null));
  }

  protected onImageLoaded(image: Image): void {
    this.displayedCaption.set(image.caption);
    this.loadedIndex$.next(this.images().findIndex(({ id }) => id === image.id));
  }

  protected onEnlarge(): void {
    this.isEnlarged.set(true);
    this.enlargedDialog()?.nativeElement.showModal();
  }

  protected onShrink(): void {
    this.enlargedDialog()?.nativeElement.close();
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

  private async onDeleteImage(image: Image): Promise<void> {
    if (await this.deletion.deleteImage(image)) {
      this.dialogRef.close();
    }
  }

  private show(image: Image | null): void {
    const shown = this.shownImage();
    if (!image || !shown || image.id === shown.id || !image.mainUrl) {
      this.pendingImage = null;
      this.shownImage.set(image);
      return;
    }

    const { mainUrl } = image;
    const pending = new window.Image();
    this.pendingImage = pending;
    pending.src = mainUrl;
    const showOnceSettled = (hasLoaded: boolean) => {
      if (this.pendingImage !== pending) {
        return;
      }
      this.pendingImage = null;
      if (hasLoaded) {
        this.loadedImages.add(mainUrl);
      }
      // One that fails to load still takes its turn, falling back as it shows
      this.shownImage.set(image);
    };
    pending.decode().then(
      () => showOnceSettled(true),
      () => showOnceSettled(false),
    );
  }

  // Once the image on screen has loaded, the ones either side load ahead, so stepping to
  // one is immediate
  private preloadNeighbours(): void {
    this.loadedIndex$
      .pipe(
        distinctUntilChanged(),
        switchMap(index => {
          const images = this.images();
          const neighbours = [
            ...new Set([
              (index + 1) % images.length,
              (index - 1 + images.length) % images.length,
            ]),
          ].filter(neighbour => index !== -1 && neighbour !== index);
          neighbours.forEach(neighbour => this.fetchImage(neighbour, true));
          return neighbours.length
            ? merge(
                ...neighbours.map(neighbour =>
                  this.store.select(
                    ImagesSelectors.selectImageById(images[neighbour].id),
                  ),
                ),
              )
            : EMPTY;
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(image => {
        const mainUrl = image?.mainUrl;
        if (mainUrl && !this.preloadedImages.has(mainUrl)) {
          const preloaded = new window.Image();
          preloaded.onload = () => this.loadedImages.add(mainUrl);
          preloaded.src = mainUrl;
          this.preloadedImages.set(mainUrl, preloaded);
        }
      });
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
        takeUntilDestroyed(this.destroyRef),
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

  // Holding a key down steps once, so a press must be released before the next one counts
  protected onKeydown(event: KeyboardEvent): void {
    const navKeys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '];
    if (!navKeys.includes(event.key)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    if (this.images().length <= 1) {
      return;
    }
    if (event.key === 'ArrowLeft' && !this.isPreviousImageButtonActive()) {
      this.isPreviousImageButtonActive.set(true);
      this.onPreviousImage();
    } else if (
      (event.key === 'ArrowRight' || event.key === ' ') &&
      !this.isNextImageButtonActive()
    ) {
      this.isNextImageButtonActive.set(true);
      this.onNextImage();
    }
  }

  protected onKeyup(event: KeyboardEvent): void {
    if (event.key === 'ArrowLeft') {
      this.isPreviousImageButtonActive.set(false);
    } else if (event.key === 'ArrowRight' || event.key === ' ') {
      this.isNextImageButtonActive.set(false);
    }
  }
}
