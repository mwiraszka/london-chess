import {
  HistoryIconComponent,
  ImageIconComponent,
  ImagePlusIconComponent,
  XCircleIconComponent,
} from '@eagami/ui';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { Store } from '@ngrx/store';
import { debounceTime } from 'rxjs/operators';

import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  input,
  output,
} from '@angular/core';
import {
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import { BasicDialogComponent } from '@app/components/basic-dialog/basic-dialog.component';
import { FormErrorIconComponent } from '@app/components/form-error-icon/form-error-icon.component';
import { ImageComponent } from '@app/components/image/image.component';
import { ModificationInfoComponent } from '@app/components/modification-info/modification-info.component';
import { TooltipDirective } from '@app/directives/tooltip.directive';
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
import { DialogService, ImageFileService, StoreRequestService } from '@app/services';
import { ImagesActions, ImagesSelectors } from '@app/store/images';
import { GENERATE_UUID } from '@app/tokens';
import { isLccError } from '@app/utils';
import { ordinalityValidator, textValidator } from '@app/validators';

@UntilDestroy()
@Component({
  selector: 'lcc-album-form',
  templateUrl: './album-form.component.html',
  styleUrl: './album-form.component.scss',
  imports: [
    FormErrorIconComponent,
    HistoryIconComponent,
    ImageComponent,
    ImageIconComponent,
    ImagePlusIconComponent,
    ModificationInfoComponent,
    ReactiveFormsModule,
    TooltipDirective,
    XCircleIconComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AlbumFormComponent implements OnInit {
  private readonly dialogService = inject(DialogService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly imageFileService = inject(ImageFileService);

  public readonly album = input.required<string | null>();
  public readonly existingAlbums = input.required<string[]>();
  public readonly hasUnsavedChanges = input.required<boolean | null>();
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

  public form!: FormGroup<AlbumFormGroup>;
  public newImageDataUrls: Record<string, Url> = {};

  public get mostRecentModificationInfo(): ModificationInfo | null {
    const imageEntities = this.imageEntities();
    if (!imageEntities.length) {
      return null;
    }

    return imageEntities.reduce<ModificationInfo | null>((mostRecent, entity) => {
      const currentModInfo = entity.image.modificationInfo;

      if (!mostRecent) {
        return currentModInfo;
      }

      const mostRecentDate = new Date(mostRecent.dateLastEdited);
      const currentDate = new Date(currentModInfo.dateLastEdited);

      return currentDate > mostRecentDate ? currentModInfo : mostRecent;
    }, null);
  }

  private readonly generateUuid = inject(GENERATE_UUID);
  private readonly storeRequests = inject(StoreRequestService);
  private readonly uploadProgress = inject(Store).selectSignal(
    ImagesSelectors.selectUploadProgress,
  );

  public ngOnInit(): void {
    this.initForm();
    this.initFormValueChangeListener();

    if (Object.keys(this.newImagesFormData()).length) {
      this.fetchNewImageDataUrls();
    }

    if (this.hasUnsavedChanges()) {
      this.form.markAllAsTouched();
    }
  }

  public onSetAlbumCover(id: Id): void {
    this.form.controls.existingImages.controls.forEach(control => {
      control.controls.albumCover.setValue(control.value.id === id, { emitEvent: false });
    });

    this.form.controls.newImages.controls.forEach(control => {
      control.controls.albumCover.setValue(control.value.id === id, { emitEvent: false });
    });

    // Trigger a single form data change
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

    const dialogResult = await this.dialogService.open<
      BasicDialogComponent,
      BasicDialogResult
    >({
      componentType: BasicDialogComponent,
      inputs: { dialog },
      isModal: false,
    });

    if (dialogResult !== 'confirm') {
      return;
    }

    const deleteResult = await this.imageFileService.deleteImage(image.id);
    if (isLccError(deleteResult)) {
      this.fileActionFail.emit(deleteResult);
    } else {
      this.form.controls.newImages.removeAt(index);
      delete this.newImageDataUrls[image.id];
      this.removeNewImage.emit(image.id);

      // Set album cover to the first available image
      if (image.albumCover) {
        const firstAvailableImage =
          this.form.controls.newImages.controls.find(
            control => !control.value.albumCover,
          ) ||
          this.form.controls.existingImages.controls.find(
            control => !control.value.albumCover,
          );

        if (firstAvailableImage) {
          firstAvailableImage.controls.albumCover.setValue(true);
        }
      }
    }
  }

  public async onChooseFiles(event: Event): Promise<void> {
    const fileInputElement = event.target as HTMLInputElement;
    const files = fileInputElement.files;

    if (!files?.length) {
      fileInputElement.value = '';
      return;
    }

    const totalNewImages = Object.keys(this.newImagesFormData()).length + files.length;
    if (totalNewImages > 20) {
      this.fileActionFail.emit({
        name: 'LCCError',
        message: 'Only up to 20 images can be uploaded at a time',
      });
      fileInputElement.value = '';
      return;
    }
    let ordinalityCounter = 1;
    const processFiles = Array.from(files).map(async file => {
      const result = await this.imageFileService.storeImageFile(
        `new-${this.generateUuid()}`,
        file,
      );

      if (isLccError(result)) {
        this.fileActionFail.emit(result);
      } else {
        const { id, dataUrl, filename } = result;
        const isFirstImageInAlbum =
          !this.imageEntities().length && !Object.keys(this.newImageDataUrls).length;
        const albumOrdinality =
          this.imageEntities().length +
          Object.keys(this.newImagesFormData()).length +
          +ordinalityCounter;

        const newImageFormGroup = this.formBuilder.group<Omit<ImageFormGroup, 'album'>>({
          id: new FormControl(id, { nonNullable: true }),
          filename: new FormControl(filename, { nonNullable: true }),
          caption: new FormControl(filename.substring(0, filename.lastIndexOf('.')), {
            nonNullable: true,
            validators: [Validators.required, textValidator],
          }),
          albumOrdinality: new FormControl(`${albumOrdinality}`, {
            nonNullable: true,
            validators: [Validators.required, ordinalityValidator],
          }),
          albumCover: new FormControl(isFirstImageInAlbum, { nonNullable: true }),
        });

        this.newImageDataUrls[id] = dataUrl;

        this.form.controls.newImages.push(newImageFormGroup);

        ordinalityCounter++;
      }
    });

    Promise.all(processFiles).then(() => {
      fileInputElement.value = '';
    });
  }

  public async onRestore(): Promise<void> {
    const dialog: Dialog = {
      title: 'Confirm',
      body: 'Restore original album data? All changes will be lost.',
      confirmButtonText: 'Restore',
      confirmButtonType: 'warning',
    };

    const dialogResult = await this.dialogService.open<
      BasicDialogComponent,
      BasicDialogResult
    >({
      componentType: BasicDialogComponent,
      inputs: { dialog },
      isModal: false,
    });

    if (dialogResult !== 'confirm') {
      return;
    }

    this.restore.emit(this.album());

    setTimeout(() => this.ngOnInit());
  }

  public onCancel(): void {
    this.cancel.emit();
  }

  public async onSubmit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

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
      confirmButtonText: this.album() ? 'Update' : 'Create',
      confirmAction: () => this.save(),
      uploadProgress: this.uploadProgress,
    };

    await this.dialogService.open<BasicDialogComponent, BasicDialogResult>({
      componentType: BasicDialogComponent,
      inputs: { dialog },
      isModal: false,
    });
  }

  private async save(): Promise<unknown> {
    const album = this.album();
    if (album) {
      return this.storeRequests.dispatch(
        ImagesActions.updateAlbumRequested({ album: album }),
        [ImagesActions.updateAlbumSucceeded, ImagesActions.updateAlbumFailed],
      );
    }
    if (Object.keys(this.newImagesFormData()).length) {
      return this.storeRequests.dispatch(ImagesActions.addImagesRequested(), [
        ImagesActions.addImagesSucceeded,
        ImagesActions.addImagesFailed,
      ]);
    }
    return null;
  }

  private async fetchNewImageDataUrls(): Promise<void> {
    const result = await this.imageFileService.getAllImages();
    if (isLccError(result)) {
      this.fileActionFail.emit(result);
    } else {
      this.newImageDataUrls = result.reduce(
        (acc, { id, dataUrl }) => {
          acc[id] = dataUrl;
          return acc;
        },
        {} as Record<string, Url>,
      );
    }
  }

  private async initForm(): Promise<void> {
    const existingImagesFormArray = new FormArray(
      this.imageEntities().map(entity =>
        this.formBuilder.group<Omit<ImageFormGroup, 'album'>>({
          id: new FormControl(entity.formData.id, { nonNullable: true }),
          filename: new FormControl(entity.formData.filename, { nonNullable: true }),
          caption: new FormControl(entity.formData.caption, {
            nonNullable: true,
            validators: [Validators.required, textValidator],
          }),
          albumOrdinality: new FormControl(entity.formData.albumOrdinality, {
            nonNullable: true,
            validators: [Validators.required, ordinalityValidator],
          }),
          albumCover: new FormControl(entity.formData.albumCover, {
            nonNullable: true,
          }),
        }),
      ),
    );

    const newImagesFormArray = new FormArray(
      Object.values(this.newImagesFormData()).map(formData =>
        this.formBuilder.group<Omit<ImageFormGroup, 'album'>>({
          id: new FormControl(formData.id, { nonNullable: true }),
          filename: new FormControl(formData.filename, { nonNullable: true }),
          caption: new FormControl(formData.caption, {
            nonNullable: true,
            validators: [Validators.required, textValidator],
          }),
          albumOrdinality: new FormControl(formData.albumOrdinality, {
            nonNullable: true,
            validators: [Validators.required, ordinalityValidator],
          }),
          albumCover: new FormControl(formData.albumCover, {
            nonNullable: true,
          }),
        }),
      ),
    );

    const imageEntities = this.imageEntities();
    const albumValue = imageEntities.length
      ? imageEntities[0].formData.album
      : Object.keys(this.newImagesFormData()).length
        ? Object.values(this.newImagesFormData())[0].album
        : (this.album() ?? '');

    this.form = this.formBuilder.group<AlbumFormGroup>({
      album: new FormControl(albumValue, {
        nonNullable: true,
        validators: [Validators.required, textValidator],
      }),
      existingImages: existingImagesFormArray,
      newImages: newImagesFormArray,
    });
  }

  private initFormValueChangeListener(): void {
    this.form.valueChanges.pipe(debounceTime(250), untilDestroyed(this)).subscribe(() => {
      const multipleFormData: (Partial<ImageFormData> & { id: Id })[] = [
        ...Array.from(this.form.controls.existingImages.controls).map(control => ({
          ...control.getRawValue(),
          album: this.form.controls.album.value,
        })),
        ...Array.from(this.form.controls.newImages.controls).map(control => ({
          ...control.getRawValue(),
          album: this.form.controls.album.value,
        })),
      ];

      this.change.emit({ multipleFormData });
    });

    // Manually trigger form data change to pass initial form data to store
    this.form.updateValueAndValidity();
  }
}
