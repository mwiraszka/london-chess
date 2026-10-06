import {
  ButtonComponent,
  CardComponent,
  DialogService,
  DividerComponent,
  FileUploaderComponent,
  ImagePlusIconComponent,
  InputComponent,
  RadioComponent,
  RadioGroupComponent,
  TooltipDirective,
  XCircleIconComponent,
} from '@eagami/ui';
import { Store } from '@ngrx/store';
import { omit, pick } from 'lodash';
import { debounceTime } from 'rxjs/operators';

import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  OnInit,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormArray,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import { BasicDialogComponent } from '@app/components/basic-dialog/basic-dialog.component';
import { FormActionsComponent } from '@app/components/form-actions/form-actions.component';
import { ImageComponent } from '@app/components/image/image.component';
import { ModificationInfoComponent } from '@app/components/modification-info/modification-info.component';
import { IMAGE_FORM_DATA_PROPERTIES } from '@app/constants';
import { FORM_CHANGE_DEBOUNCE, FORM_ERROR_MESSAGES } from '@app/constants/forms';
import { MAX_NEW_IMAGES } from '@app/constants/images';
import {
  AlbumFormGroup,
  BasicDialogResult,
  Dialog,
  Id,
  Image,
  ImageFormData,
  ImageFormGroup,
  LccError,
  ModificationInfo,
  Url,
} from '@app/models';
import { ImageFileService, StoreRequestService } from '@app/services';
import { ImagesActions, ImagesSelectors } from '@app/store/images';
import { GENERATE_UUID } from '@app/tokens';
import { isLccError } from '@app/utils';
import { ordinalityValidator, textValidator } from '@app/validators';

@Component({
  selector: 'lcc-album-form',
  templateUrl: './album-form.component.html',
  styleUrl: './album-form.component.scss',
  imports: [
    ButtonComponent,
    CardComponent,
    DividerComponent,
    FileUploaderComponent,
    FormActionsComponent,
    ImageComponent,
    InputComponent,
    ModificationInfoComponent,
    RadioComponent,
    RadioGroupComponent,
    ReactiveFormsModule,
    TooltipDirective,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AlbumFormComponent implements OnInit {
  private readonly changeDetectorRef = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly dialogService = inject(DialogService);
  private readonly generateUuid = inject(GENERATE_UUID);
  private readonly imageFileService = inject(ImageFileService);
  private readonly storeRequests = inject(StoreRequestService);
  private readonly uploadProgress = inject(Store).selectSignal(
    ImagesSelectors.selectUploadProgress,
  );

  public readonly album = input.required<string | null>();
  public readonly hasUnsavedChanges = input.required<boolean>();
  public readonly imageEntities = input.required<
    {
      image: Image;
      formData: ImageFormData;
    }[]
  >();
  public readonly newImagesFormData = input.required<Record<string, ImageFormData>>();

  public readonly cancel = output<void>();
  public readonly change = output<{
    multipleFormData: (Partial<ImageFormData> & {
      id: Id;
    })[];
  }>();
  public readonly fileActionFail = output<LccError>();
  public readonly removeNewImage = output<Id>();
  public readonly restore = output<string | null>();

  protected readonly errorMessages = FORM_ERROR_MESSAGES;
  // Emptied after every choice, so each pick adds only the files it brings
  protected readonly fileChoice = new FormControl<readonly File[]>([], {
    nonNullable: true,
  });
  protected readonly imagePlusIcon = ImagePlusIconComponent;
  protected readonly removeIcon = XCircleIconComponent;

  public form!: FormGroup<AlbumFormGroup>;
  public readonly newImageDataUrls = signal<Record<string, Url>>({});

  public get mostRecentModificationInfo(): ModificationInfo | null {
    return this.imageEntities().reduce<ModificationInfo | null>(
      (mostRecent, { image }) =>
        !mostRecent ||
        new Date(image.modificationInfo.dateLastEdited) >
          new Date(mostRecent.dateLastEdited)
          ? image.modificationInfo
          : mostRecent,
      null,
    );
  }

  protected get chooseFilesLabel(): string {
    return this.imageEntities().length || this.form.controls.newImages.length
      ? 'Add more files'
      : 'Choose files';
  }

  protected get coverImageId(): Id {
    return (
      this.allImageControls().find(control => control.controls.albumCover.value)?.controls
        .id.value ?? ''
    );
  }

  public ngOnInit(): void {
    this.form = this.buildForm();

    // Images chosen or removed reshape the form outside any field event, so its changes
    // still have to refresh this view
    this.form.events
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.changeDetectorRef.markForCheck());

    this.form.valueChanges
      .pipe(debounceTime(FORM_CHANGE_DEBOUNCE), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.emitChange());
    this.emitChange();

    this.fileChoice.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(files => {
        if (files.length) {
          this.fileChoice.setValue([], { emitEvent: false });
          this.onChooseFiles(files);
        }
      });

    if (Object.keys(this.newImagesFormData()).length) {
      this.fetchNewImageDataUrls();
    }

    if (this.hasUnsavedChanges()) {
      this.form.markAllAsTouched();
    }
  }

  public onSetAlbumCover(id: Id): void {
    this.allImageControls().forEach(control => {
      control.controls.albumCover.setValue(control.controls.id.value === id, {
        emitEvent: false,
      });
    });

    // Passes the new cover on as one change
    this.form.updateValueAndValidity();
  }

  public async onRemoveNewImage(
    image: Omit<ImageFormData, 'album'>,
    index: number,
  ): Promise<void> {
    const dialog: Dialog = {
      title: 'Confirm',
      body: `Remove ${image.filename}?`,
      confirmButtonText: 'Remove',
      confirmButtonType: 'warning',
    };

    const dialogResult = await this.dialogService.open<BasicDialogResult>(
      BasicDialogComponent,
      { inputs: { dialog } },
    ).result;

    if (dialogResult !== 'confirm') {
      return;
    }

    this.form.controls.newImages.removeAt(index);
    this.newImageDataUrls.update(urls => omit(urls, image.id));
    this.removeNewImage.emit(image.id);

    // The cover passes to the first image left, new images coming before existing ones
    if (image.albumCover) {
      this.allImageControls().at(0)?.controls.albumCover.setValue(true);
    }
  }

  public async onChooseFiles(files: readonly File[]): Promise<void> {
    const { existingImages, newImages } = this.form.controls;

    if (newImages.length + files.length > MAX_NEW_IMAGES) {
      this.fileActionFail.emit({
        name: 'LCCError',
        message: `Only up to ${MAX_NEW_IMAGES} images can be uploaded at a time.`,
      });
      return;
    }

    await Promise.all(
      files.map(async file => {
        const result = await this.imageFileService.storeImageFile(
          `new-${this.generateUuid()}`,
          file,
        );

        if (isLccError(result)) {
          this.fileActionFail.emit(result);
          return;
        }

        const { id, dataUrl, filename } = result;
        const isFirstImage = !existingImages.length && !newImages.length;

        this.newImageDataUrls.update(urls => ({ ...urls, [id]: dataUrl }));
        newImages.push(
          this.buildImageGroup({
            id,
            filename,
            caption: filename.substring(0, filename.lastIndexOf('.')),
            albumOrdinality: `${existingImages.length + newImages.length + 1}`,
            albumCover: isFirstImage,
          }),
        );
      }),
    );
  }

  public onRejectFiles(): void {
    this.fileActionFail.emit({
      name: 'LCCError',
      message: 'Only image files can be added.',
    });
  }

  public onRestore(): void {
    const originals = this.imageEntities().map(({ image }) => image);

    this.restore.emit(this.album());
    this.newImageDataUrls.set({});
    this.form.controls.newImages.clear({ emitEvent: false });
    this.form.reset({
      album: this.album() ?? '',
      existingImages: this.form.controls.existingImages.controls.map(control => {
        const original = originals.find(({ id }) => id === control.controls.id.value);
        return original ? this.toImageValue(original) : control.getRawValue();
      }),
    });
  }

  public onCancel(): void {
    this.cancel.emit();
  }

  // A click that leaves the page starts by leaving a field, so the draft is saved first
  public onFieldLeft(): void {
    this.emitChange();
  }

  public async onSubmit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    // The draft reaches the store after a pause in typing, and saving reads it from there
    this.emitChange();

    const newImagesCount = this.form.controls.newImages.length;
    const thisOrThese = newImagesCount === 1 ? 'this' : 'these';
    const imageOrImages = newImagesCount === 1 ? 'image' : 'images';

    const album = this.album();
    const body =
      album && newImagesCount
        ? `Update ${album} and upload ${thisOrThese} ${newImagesCount} new ${imageOrImages}?`
        : album
          ? `Update ${album}?`
          : `Create new album with ${thisOrThese} ${newImagesCount} new ${imageOrImages}?`;

    const dialog: Dialog = {
      title: 'Confirm',
      body,
      confirmButtonText: album ? 'Update' : 'Create',
      confirmAction: () => this.save(),
      uploadProgress: this.uploadProgress,
    };

    await this.dialogService.open(BasicDialogComponent, { inputs: { dialog } }).result;
  }

  private save(): Promise<unknown> {
    const album = this.album();
    return album
      ? this.storeRequests.dispatch(ImagesActions.updateAlbumRequested({ album }), [
          ImagesActions.updateAlbumSucceeded,
          ImagesActions.updateAlbumFailed,
        ])
      : this.storeRequests.dispatch(ImagesActions.addImagesRequested(), [
          ImagesActions.addImagesSucceeded,
          ImagesActions.addImagesFailed,
        ]);
  }

  private fetchNewImageDataUrls(): void {
    const imageFiles = this.imageFileService.getImages(
      Object.keys(this.newImagesFormData()),
    );

    this.newImageDataUrls.set(
      Object.fromEntries(imageFiles.map(({ id, dataUrl }) => [id, dataUrl])),
    );
  }

  private allImageControls(): FormGroup<Omit<ImageFormGroup, 'album'>>[] {
    return [
      ...this.form.controls.newImages.controls,
      ...this.form.controls.existingImages.controls,
    ];
  }

  private toImageValue(data: ImageFormData | Image): Omit<ImageFormData, 'album'> {
    return omit(pick(data, IMAGE_FORM_DATA_PROPERTIES), 'album');
  }

  private buildImageGroup(
    value: Omit<ImageFormData, 'album'>,
  ): FormGroup<Omit<ImageFormGroup, 'album'>> {
    return new FormGroup<Omit<ImageFormGroup, 'album'>>({
      id: new FormControl(value.id, { nonNullable: true }),
      filename: new FormControl(value.filename, { nonNullable: true }),
      caption: new FormControl(value.caption, {
        nonNullable: true,
        validators: [Validators.required, textValidator],
      }),
      albumOrdinality: new FormControl(value.albumOrdinality, {
        nonNullable: true,
        validators: [Validators.required, ordinalityValidator],
      }),
      albumCover: new FormControl(value.albumCover, { nonNullable: true }),
    });
  }

  private buildForm(): FormGroup<AlbumFormGroup> {
    const existingImages = this.imageEntities().map(({ formData }) => formData);
    const newImages = Object.values(this.newImagesFormData());
    const album = existingImages[0]?.album ?? newImages[0]?.album ?? this.album() ?? '';

    return new FormGroup<AlbumFormGroup>({
      album: new FormControl(album, {
        nonNullable: true,
        validators: [Validators.required, textValidator],
      }),
      existingImages: new FormArray(
        existingImages.map(formData => this.buildImageGroup(this.toImageValue(formData))),
      ),
      // A new album is created by its first upload, so it cannot be saved without one
      newImages: new FormArray(
        newImages.map(formData => this.buildImageGroup(this.toImageValue(formData))),
        this.album() ? null : Validators.required,
      ),
    });
  }

  private emitChange(): void {
    const album = this.form.controls.album.value;
    this.change.emit({
      multipleFormData: [
        ...this.form.controls.existingImages.controls,
        ...this.form.controls.newImages.controls,
      ].map(control => ({ ...control.getRawValue(), album })),
    });
  }
}
