import { HistoryIconComponent, ImageIconComponent } from '@eagami/ui';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { debounceTime } from 'rxjs/operators';

import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
  inject,
} from '@angular/core';
import {
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
import { INITIAL_IMAGE_FORM_DATA } from '@app/constants';
import { TooltipDirective } from '@app/directives/tooltip.directive';
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
import { DialogService, ImageFileService } from '@app/services';
import { GENERATE_UUID } from '@app/tokens';
import { isLccError } from '@app/utils';
import { textValidator } from '@app/validators';

@UntilDestroy()
@Component({
  selector: 'lcc-image-form',
  templateUrl: './image-form.component.html',
  styleUrl: './image-form.component.scss',
  imports: [
    FormErrorIconComponent,
    HistoryIconComponent,
    ImageComponent,
    ImageIconComponent,
    ModificationInfoComponent,
    ReactiveFormsModule,
    TooltipDirective,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImageFormComponent implements OnInit {
  @Input({ required: true }) public existingAlbums!: string[];
  @Input({ required: true }) public hasUnsavedChanges!: boolean;
  @Input({ required: true }) public imageEntity!: {
    image: Image;
    formData: ImageFormData;
  } | null;
  @Input({ required: true }) public newImageFormData!: ImageFormData | null;

  @Output() public readonly cancel = new EventEmitter<void>();
  @Output() public readonly change = new EventEmitter<{
    multipleFormData: (Partial<ImageFormData> & { id: Id })[];
  }>();
  @Output() public readonly fileActionFail = new EventEmitter<LccError>();
  @Output() public readonly requestAddImage = new EventEmitter<Id>();
  @Output() public readonly requestFetchMainImage = new EventEmitter<Id>();
  @Output() public readonly requestUpdateImage = new EventEmitter<Id>();
  @Output() public readonly restore = new EventEmitter<Id>();

  public form!: FormGroup<ImageFormGroup>;
  public newAlbumValue!: string;
  public newImageDataUrl: Url | null = null;

  private readonly generateUuid = inject(GENERATE_UUID);

  constructor(
    private readonly dialogService: DialogService,
    private readonly formBuilder: FormBuilder,
    private readonly imageFileService: ImageFileService,
  ) {}

  public ngOnInit(): void {
    this.initForm();
    this.initFormValueChangeListener();

    if (this.newImageFormData) {
      this.fetchNewImageDataUrl(this.newImageFormData.id);
    }

    if (
      this.imageEntity &&
      !this.imageEntity.image.thumbnailUrl &&
      !this.imageEntity.image.mainUrl
    ) {
      this.requestFetchMainImage.emit(this.imageEntity.image.id);
    }

    if (this.hasUnsavedChanges) {
      this.form.markAllAsTouched();
    }
  }

  get albumExists(): boolean {
    return this.existingAlbums.some(album => album === this.form.controls.album.value);
  }

  public onNewAlbumInputChange(event: Event): void {
    this.newAlbumValue = (event.target as HTMLInputElement).value;
    this.form.patchValue({ album: this.newAlbumValue });
  }

  public onNewAlbumInputFocus(): void {
    const radioElement = document.getElementById('new-album-input') as HTMLInputElement;
    if (radioElement) {
      radioElement.checked = true;
    }
    this.form.patchValue({ album: this.newAlbumValue });
  }

  public async onChooseFile(event: Event): Promise<void> {
    const fileInputElement = event.target as HTMLInputElement;
    const file = fileInputElement.files?.length ? fileInputElement.files[0] : null;

    if (file) {
      const id = this.form.controls.id.value;
      const result = await this.imageFileService.storeImageFile(id, file, true);

      if (isLccError(result)) {
        this.fileActionFail.emit(result);
      } else {
        const { dataUrl, filename } = result;
        const caption =
          this.form.controls.caption.value ||
          filename.substring(0, filename.lastIndexOf('.'));

        this.newImageDataUrl = dataUrl;
        this.form.patchValue({ id, filename, caption });
      }
    }

    fileInputElement.value = '';
  }

  public async onRestore(): Promise<void> {
    const dialog: Dialog = {
      title: 'Confirm',
      body: 'Restore original image data? All changes will be lost.',
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

    this.restore.emit(this.form.controls.id.value);
    this.newImageDataUrl = null;

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

    const dialog: Dialog = {
      title: 'Confirm',
      body: this.imageEntity
        ? `Update ${this.imageEntity.image.filename}?`
        : `Add ${this.form.controls.filename.value} to ${this.form.controls.album.value}?`,
      confirmButtonText: this.imageEntity ? 'Update' : 'Add',
    };

    const result = await this.dialogService.open<BasicDialogComponent, BasicDialogResult>(
      {
        componentType: BasicDialogComponent,
        inputs: { dialog },
        isModal: false,
      },
    );

    if (result !== 'confirm') {
      return;
    }

    const imageId = this.form.controls.id.value;
    if (this.imageEntity) {
      this.requestUpdateImage.emit(imageId);
    } else {
      this.requestAddImage.emit(imageId);
    }
  }

  private async fetchNewImageDataUrl(id: Id): Promise<void> {
    const result = await this.imageFileService.getImage(id);

    if (isLccError(result)) {
      this.fileActionFail.emit(result);
    } else if (result) {
      this.newImageDataUrl = result.dataUrl;
    }
  }

  private initForm(): void {
    const formData: ImageFormData = this.imageEntity?.formData ??
      this.newImageFormData ?? {
        ...INITIAL_IMAGE_FORM_DATA,
        id: `new-${this.generateUuid()}`,
      };

    this.form = this.formBuilder.group<ImageFormGroup>({
      id: new FormControl(formData.id, {
        nonNullable: true,
      }),
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
        validators: [Validators.required, textValidator],
      }),
      albumCover: new FormControl(formData.albumCover, { nonNullable: true }),
      albumOrdinality: new FormControl(formData.albumOrdinality, { nonNullable: true }),
    });

    this.newAlbumValue = !this.existingAlbums.includes(formData.album)
      ? formData.album
      : '';
  }

  private initFormValueChangeListener(): void {
    this.form.valueChanges
      .pipe(debounceTime(250), untilDestroyed(this))
      .subscribe((value: Partial<ImageFormData>) => {
        const id = this.form.controls.id.value;
        this.change.emit({ multipleFormData: [{ ...value, id }] });
      });

    // Manually trigger form data change to pass initial form data to store
    this.form.updateValueAndValidity();
  }
}
