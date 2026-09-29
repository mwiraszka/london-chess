import {
  AutocompleteComponent,
  ButtonComponent,
  CardComponent,
  DialogService,
  FileUploaderComponent,
  HistoryIconComponent,
  InputComponent,
  SelectOption,
} from '@eagami/ui';
import { pick } from 'lodash';
import { debounceTime } from 'rxjs/operators';

import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { BasicDialogComponent } from '@app/components/basic-dialog/basic-dialog.component';
import { ImageComponent } from '@app/components/image/image.component';
import { ModificationInfoComponent } from '@app/components/modification-info/modification-info.component';
import { IMAGE_FORM_DATA_PROPERTIES, INITIAL_IMAGE_FORM_DATA } from '@app/constants';
import { FORM_CHANGE_DEBOUNCE, FORM_ERROR_MESSAGES } from '@app/constants/forms';
import { IMAGE_FALLBACK_SRC } from '@app/constants/images';
import {
  BasicDialogResult,
  Dialog,
  Id,
  Image,
  ImageFormData,
  ImageFormGroup,
  LccError,
  Url,
} from '@app/models';
import { ImageFileService, StoreRequestService } from '@app/services';
import { ImagesActions } from '@app/store/images';
import { GENERATE_UUID } from '@app/tokens';
import { isLccError } from '@app/utils';
import { textValidator } from '@app/validators';

@Component({
  selector: 'lcc-image-form',
  templateUrl: './image-form.component.html',
  styleUrl: './image-form.component.scss',
  imports: [
    AutocompleteComponent,
    ButtonComponent,
    CardComponent,
    FileUploaderComponent,
    ImageComponent,
    InputComponent,
    ModificationInfoComponent,
    ReactiveFormsModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImageFormComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly dialogService = inject(DialogService);
  private readonly generateUuid = inject(GENERATE_UUID);
  private readonly imageFileService = inject(ImageFileService);
  private readonly storeRequests = inject(StoreRequestService);

  public readonly existingAlbums = input.required<string[]>();
  public readonly hasUnsavedChanges = input.required<boolean>();
  public readonly imageEntity = input.required<{
    image: Image;
    formData: ImageFormData;
  } | null>();
  public readonly newImageFormData = input.required<ImageFormData | null>();

  public readonly cancel = output<void>();
  public readonly change = output<{
    multipleFormData: (Partial<ImageFormData> & {
      id: Id;
    })[];
  }>();
  public readonly fileActionFail = output<LccError>();
  public readonly requestFetchMainImage = output<Id>();
  public readonly restore = output<Id>();

  protected readonly albumOptions = computed<SelectOption[]>(() =>
    this.existingAlbums().map(album => ({ value: album, label: album })),
  );
  protected readonly errorMessages = FORM_ERROR_MESSAGES;
  protected readonly fallbackSrc = IMAGE_FALLBACK_SRC;
  // Only the chosen file's name is saved with the image, so the picker has its own control
  protected readonly fileChoice = new FormControl<readonly File[]>([], {
    nonNullable: true,
  });
  protected readonly newImageDataUrl = signal<Url | null>(null);
  protected readonly restoreIcon = HistoryIconComponent;

  public form!: FormGroup<ImageFormGroup>;

  protected get showFileError(): boolean {
    const { filename } = this.form.controls;
    return filename.touched && filename.invalid;
  }

  public ngOnInit(): void {
    this.form = this.buildForm();

    this.form.valueChanges
      .pipe(debounceTime(FORM_CHANGE_DEBOUNCE), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.emitChange());
    this.emitChange();

    this.fileChoice.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(([file]) => {
        if (file) {
          this.onChooseFile(file);
        }
      });

    const newImageFormData = this.newImageFormData();
    if (newImageFormData) {
      this.fetchNewImageDataUrl(newImageFormData.id);
    }

    const imageEntity = this.imageEntity();
    if (imageEntity && !imageEntity.image.thumbnailUrl && !imageEntity.image.mainUrl) {
      this.requestFetchMainImage.emit(imageEntity.image.id);
    }

    if (this.hasUnsavedChanges()) {
      this.form.markAllAsTouched();
    }
  }

  public async onChooseFile(file: File): Promise<void> {
    const id = this.form.controls.id.value;
    const result = await this.imageFileService.storeImageFile(id, file, true);

    if (isLccError(result)) {
      this.fileActionFail.emit(result);
      return;
    }

    const { dataUrl, filename } = result;
    const caption =
      this.form.controls.caption.value ||
      filename.substring(0, filename.lastIndexOf('.'));

    this.newImageDataUrl.set(dataUrl);
    this.form.patchValue({ id, filename, caption });
  }

  public onRejectFiles(): void {
    this.fileActionFail.emit({
      name: 'LCCError',
      message: 'Only image files can be added.',
    });
  }

  public async onRestore(): Promise<void> {
    const dialog: Dialog = {
      title: 'Confirm',
      body: 'Restore original image data? All changes will be lost.',
      confirmButtonText: 'Restore',
      confirmButtonType: 'warning',
    };

    const dialogResult = await this.dialogService.open<BasicDialogResult>(
      BasicDialogComponent,
      { inputs: { dialog } },
    ).result;

    if (dialogResult !== 'confirm') {
      return;
    }

    const id = this.form.controls.id.value;
    const imageEntity = this.imageEntity();

    this.restore.emit(id);
    this.newImageDataUrl.set(null);
    this.form.reset(
      imageEntity
        ? pick(imageEntity.image, IMAGE_FORM_DATA_PROPERTIES)
        : { ...INITIAL_IMAGE_FORM_DATA, id },
    );
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

    const imageEntity = this.imageEntity();
    const { id, filename, album } = this.form.getRawValue();
    const dialog: Dialog = {
      title: 'Confirm',
      body: imageEntity
        ? `Update ${imageEntity.image.filename}?`
        : `Add ${filename} to ${album}?`,
      confirmButtonText: imageEntity ? 'Update' : 'Add',
      confirmAction: () => this.save(id),
    };

    await this.dialogService.open(BasicDialogComponent, { inputs: { dialog } }).result;
  }

  private save(imageId: Id): Promise<unknown> {
    return this.imageEntity()
      ? this.storeRequests.dispatch(ImagesActions.updateImageRequested({ imageId }), [
          ImagesActions.updateImageSucceeded,
          ImagesActions.updateImageFailed,
        ])
      : this.storeRequests.dispatch(ImagesActions.addImageRequested({ imageId }), [
          ImagesActions.addImageSucceeded,
          ImagesActions.addImageFailed,
        ]);
  }

  private async fetchNewImageDataUrl(id: Id): Promise<void> {
    const result = await this.imageFileService.getImage(id);

    if (isLccError(result)) {
      this.fileActionFail.emit(result);
    } else if (result) {
      this.newImageDataUrl.set(result.dataUrl);
    }
  }

  private buildForm(): FormGroup<ImageFormGroup> {
    const formData: ImageFormData = this.imageEntity()?.formData ??
      this.newImageFormData() ?? {
        ...INITIAL_IMAGE_FORM_DATA,
        id: `new-${this.generateUuid()}`,
      };

    return new FormGroup<ImageFormGroup>({
      id: new FormControl(formData.id, { nonNullable: true }),
      filename: new FormControl(formData.filename, {
        nonNullable: true,
        validators: Validators.required,
      }),
      caption: new FormControl(formData.caption, {
        nonNullable: true,
        validators: [Validators.required, textValidator],
      }),
      album: new FormControl(formData.album, {
        nonNullable: true,
        validators: [Validators.required, Validators.maxLength(120), textValidator],
      }),
      albumCover: new FormControl(formData.albumCover, { nonNullable: true }),
      albumOrdinality: new FormControl(formData.albumOrdinality, { nonNullable: true }),
    });
  }

  private emitChange(): void {
    this.change.emit({ multipleFormData: [this.form.getRawValue()] });
  }
}
