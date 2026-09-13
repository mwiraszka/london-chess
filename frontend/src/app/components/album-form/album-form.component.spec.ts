import { provideMockStore } from '@ngrx/store/testing';
import { pick } from 'lodash';

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';

import { BasicDialogComponent } from '@app/components/basic-dialog/basic-dialog.component';
import { IMAGE_FORM_DATA_PROPERTIES } from '@app/constants';
import { MOCK_IMAGES } from '@app/mocks/images.mock';
import { ImageFormData, LccError } from '@app/models';
import { DialogService, ImageFileService } from '@app/services';
import { initialState as membersInitialState } from '@app/store/members/members.reducer';
import { GENERATE_UUID } from '@app/tokens';
import { query, queryTextContent } from '@app/utils';

import { AlbumFormComponent } from './album-form.component';

describe('AlbumFormComponent', () => {
  let fixture: ComponentFixture<AlbumFormComponent>;
  let component: AlbumFormComponent;

  let dialogService: DialogService;
  let imageFileService: ImageFileService;

  let cancelSpy: MockInstance;
  let changeSpy: MockInstance;
  let deleteImageSpy: MockInstance;
  let dialogOpenSpy: MockInstance;
  let fetchNewImageDataUrlsSpy: MockInstance;
  let fileActionFailSpy: MockInstance;
  let initFormSpy: MockInstance;
  let initFormValueChangeListenerSpy: MockInstance;
  let removeNewImageSpy: MockInstance;
  let requestAddImagesSpy: MockInstance;
  let requestUpdateAlbumSpy: MockInstance;
  let restoreSpy: MockInstance;
  let storeImageFileSpy: MockInstance;
  let submitSpy: MockInstance;
  let uuidSpy: MockInstance;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AlbumFormComponent, ReactiveFormsModule],
      providers: [
        provideMockStore({ initialState: { membersState: membersInitialState } }),
        { provide: GENERATE_UUID, useValue: vi.fn() },
        {
          provide: DialogService,
          useValue: { open: vi.fn() },
        },
        FormBuilder,
        {
          provide: ImageFileService,
          useValue: {
            storeImageFile: vi.fn(),
            getAllImages: vi.fn(),
            deleteImage: vi.fn(),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AlbumFormComponent);
    component = fixture.componentInstance;

    dialogService = TestBed.inject(DialogService);
    imageFileService = TestBed.inject(ImageFileService);
    vi.spyOn(imageFileService, 'getAllImages').mockResolvedValue([
      {
        id: 'new-123',
        filename: 'my-dog.png',
        dataUrl: 'data:image/png;base64,abc',
      },
      {
        id: 'new-456',
        filename: 'my-cat.jpeg',
        dataUrl: 'data:image/jpeg;base64,xyz',
      },
    ]);

    cancelSpy = vi.spyOn(component.cancel, 'emit');
    changeSpy = vi.spyOn(component.change, 'emit');
    deleteImageSpy = vi.spyOn(imageFileService, 'deleteImage');
    dialogOpenSpy = vi.spyOn(dialogService, 'open');
    // @ts-expect-error Private class member
    fetchNewImageDataUrlsSpy = vi.spyOn(component, 'fetchNewImageDataUrls');
    fileActionFailSpy = vi.spyOn(component.fileActionFail, 'emit');
    // @ts-expect-error Private class member
    initFormSpy = vi.spyOn(component, 'initForm');
    initFormValueChangeListenerSpy = vi.spyOn(
      component,
      // @ts-expect-error Private class member
      'initFormValueChangeListener',
    );
    removeNewImageSpy = vi.spyOn(component.removeNewImage, 'emit');
    requestAddImagesSpy = vi.spyOn(component.requestAddImages, 'emit');
    requestUpdateAlbumSpy = vi.spyOn(component.requestUpdateAlbum, 'emit');
    restoreSpy = vi.spyOn(component.restore, 'emit');
    storeImageFileSpy = vi.spyOn(imageFileService, 'storeImageFile');
    submitSpy = vi.spyOn(component, 'onSubmit');
    uuidSpy = TestBed.inject(GENERATE_UUID) as Mock;

    component.album = null;
    component.existingAlbums = [];
    component.hasUnsavedChanges = false;
    component.imageEntities = [];
    component.newImagesFormData = {};

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('form initialization', () => {
    describe('if both imageEntities and newImagesFormData are empty', () => {
      beforeEach(() => {
        vi.clearAllMocks();
        component.ngOnInit();
      });

      it('should initialize form and its value change listener', () => {
        expect(initFormSpy).toHaveBeenCalledTimes(1);
        expect(initFormValueChangeListenerSpy).toHaveBeenCalledTimes(1);
      });

      it('should initialize the form with empty, untouched values', () => {
        expect(component.form.controls.album.value).toBe('');
        expect(component.form.controls.existingImages.value).toStrictEqual([]);
        expect(component.form.controls.newImages.value).toStrictEqual([]);

        expect(component.form.controls.album.untouched).toBe(true);
        expect(component.form.controls.existingImages.untouched).toBe(true);
        expect(component.form.controls.newImages.untouched).toBe(true);
      });

      it('should not call fetchNewImagesDataUrls', () => {
        expect(fetchNewImageDataUrlsSpy).not.toHaveBeenCalled();
      });
    });

    describe('if imageEntities is empty and newImagesFormData contains data', () => {
      beforeEach(() => {
        vi.clearAllMocks();
        // Two images from the same album
        fixture.componentRef.setInput('newImagesFormData', {
          [MOCK_IMAGES[0].id]: pick(MOCK_IMAGES[0], IMAGE_FORM_DATA_PROPERTIES),
          [MOCK_IMAGES[3].id]: pick(MOCK_IMAGES[3], IMAGE_FORM_DATA_PROPERTIES),
        });

        component.ngOnInit();
      });

      it('should initialize form and its value change listener', () => {
        expect(initFormSpy).toHaveBeenCalledTimes(1);
        expect(initFormValueChangeListenerSpy).toHaveBeenCalledTimes(1);
      });

      it('should initialize the form with untouched values from newImageFormData', () => {
        expect(component.form.controls.album.value).toBe(MOCK_IMAGES[0].album);
        expect(component.form.controls.existingImages.value).toStrictEqual([]);

        const newImage1 = component.form.controls.newImages.at(0);
        expect(newImage1.controls.id.value).toBe(MOCK_IMAGES[0].id);
        expect(newImage1.controls.filename.value).toBe(MOCK_IMAGES[0].filename);
        expect(newImage1.controls.caption.value).toBe(MOCK_IMAGES[0].caption);
        expect(newImage1.controls.albumCover.value).toBe(MOCK_IMAGES[0].albumCover);

        const newImage2 = component.form.controls.newImages.at(1);
        expect(newImage2.controls.id.value).toBe(MOCK_IMAGES[3].id);
        expect(newImage2.controls.filename.value).toBe(MOCK_IMAGES[3].filename);
        expect(newImage2.controls.caption.value).toBe(MOCK_IMAGES[3].caption);
        expect(newImage2.controls.albumCover.value).toBe(MOCK_IMAGES[3].albumCover);

        expect(component.form.controls.album.untouched).toBe(true);
        expect(component.form.controls.existingImages.untouched).toBe(true);
        expect(component.form.controls.newImages.untouched).toBe(true);
      });

      it('should emit data URLs fetch event', () => {
        expect(fetchNewImageDataUrlsSpy).toHaveBeenCalledTimes(1);
      });
    });

    describe('if imageEntities contains data (without unsaved changes)', () => {
      beforeEach(() => {
        vi.clearAllMocks();
        fixture.componentRef.setInput('imageEntities', [
          {
            image: MOCK_IMAGES[0],
            formData: pick(MOCK_IMAGES[0], IMAGE_FORM_DATA_PROPERTIES),
          },
          {
            image: MOCK_IMAGES[3],
            formData: pick(MOCK_IMAGES[3], IMAGE_FORM_DATA_PROPERTIES),
          },
        ]);

        component.ngOnInit();
      });

      it('should initialize form and its value change listener', () => {
        expect(initFormSpy).toHaveBeenCalledTimes(1);
        expect(initFormValueChangeListenerSpy).toHaveBeenCalledTimes(1);
      });

      it('should initialize the form with untouched values from imageEntities formData', () => {
        expect(component.form.controls.album.value).toBe(MOCK_IMAGES[0].album);
        expect(component.form.controls.newImages.value).toStrictEqual([]);

        const existingImage1 = component.form.controls.existingImages.at(0);
        expect(existingImage1.controls.id.value).toBe(MOCK_IMAGES[0].id);
        expect(existingImage1.controls.filename.value).toBe(MOCK_IMAGES[0].filename);
        expect(existingImage1.controls.caption.value).toBe(MOCK_IMAGES[0].caption);
        expect(existingImage1.controls.albumCover.value).toBe(MOCK_IMAGES[0].albumCover);

        const existingImage2 = component.form.controls.existingImages.at(1);
        expect(existingImage2.controls.id.value).toBe(MOCK_IMAGES[3].id);
        expect(existingImage2.controls.filename.value).toBe(MOCK_IMAGES[3].filename);
        expect(existingImage2.controls.caption.value).toBe(MOCK_IMAGES[3].caption);
        expect(existingImage2.controls.albumCover.value).toBe(MOCK_IMAGES[3].albumCover);

        expect(component.form.controls.album.untouched).toBe(true);
        expect(component.form.controls.existingImages.untouched).toBe(true);
        expect(component.form.controls.newImages.untouched).toBe(true);
      });

      it('should not emit data URLs fetch event', () => {
        expect(fetchNewImageDataUrlsSpy).not.toHaveBeenCalled();
      });
    });

    describe('if imageEntities contains data (with some unsaved changes and undefined urls)', () => {
      beforeEach(() => {
        vi.clearAllMocks();
        fixture.componentRef.setInput('hasUnsavedChanges', true);
        fixture.componentRef.setInput('imageEntities', [
          {
            image: MOCK_IMAGES[0],
            formData: {
              id: MOCK_IMAGES[0].id,
              filename: MOCK_IMAGES[0].filename,
              caption: 'A new caption',
              album: 'A new album title',
              albumCover: true,
              albumOrdinality: '1',
            },
          },
          {
            image: {
              ...MOCK_IMAGES[3],
              mainUrl: undefined,
              thumbnailUrl: undefined,
            },
            formData: {
              ...pick(MOCK_IMAGES[3], IMAGE_FORM_DATA_PROPERTIES),
              album: 'A new album title',
            },
          },
        ]);

        component.ngOnInit();
      });

      it('should initialize form and its value change listener', () => {
        expect(initFormSpy).toHaveBeenCalledTimes(1);
        expect(initFormValueChangeListenerSpy).toHaveBeenCalledTimes(1);
      });

      it('should initialize the form with touched values from imageEntities formData', () => {
        expect(component.form.controls.album.value).toBe('A new album title');
        expect(component.form.controls.newImages.value).toStrictEqual([]);

        const existingImage1 = component.form.controls.existingImages.at(0);
        expect(existingImage1.controls.id.value).toBe(MOCK_IMAGES[0].id);
        expect(existingImage1.controls.filename.value).toBe(MOCK_IMAGES[0].filename);
        expect(existingImage1.controls.caption.value).toBe('A new caption');
        expect(existingImage1.controls.albumCover.value).toBe(MOCK_IMAGES[0].albumCover);

        const existingImage2 = component.form.controls.existingImages.at(1);
        expect(existingImage2.controls.id.value).toBe(MOCK_IMAGES[3].id);
        expect(existingImage2.controls.filename.value).toBe(MOCK_IMAGES[3].filename);
        expect(existingImage2.controls.caption.value).toBe(MOCK_IMAGES[3].caption);
        expect(existingImage2.controls.albumCover.value).toBe(MOCK_IMAGES[3].albumCover);

        expect(component.form.controls.album.touched).toBe(true);
        expect(component.form.controls.existingImages.touched).toBe(true);
        expect(component.form.controls.newImages.touched).toBe(true);
      });

      it('should not emit data URLs fetch event', () => {
        expect(fetchNewImageDataUrlsSpy).not.toHaveBeenCalled();
      });
    });
  });

  describe('form validation', () => {
    beforeEach(() => {
      // Two images from the same album
      component.newImagesFormData = {
        [MOCK_IMAGES[0].id]: pick(MOCK_IMAGES[0], IMAGE_FORM_DATA_PROPERTIES),
        [MOCK_IMAGES[3].id]: pick(MOCK_IMAGES[3], IMAGE_FORM_DATA_PROPERTIES),
      };
      fixture.detectChanges();

      component.ngOnInit();
    });

    describe('required validator', () => {
      it('should mark empty field as invalid', () => {
        component.form.controls.newImages.at(0).patchValue({ caption: '' });
        component.form.markAllAsTouched();
        fixture.detectChanges();

        expect(
          component.form.controls.newImages.at(0).controls.caption.hasError('required'),
        ).toBe(true);
      });

      it('should mark non-empty field as valid', () => {
        component.form.controls.newImages.at(0).patchValue({ caption: 'Valid caption' });
        component.form.markAllAsTouched();
        fixture.detectChanges();

        expect(
          component.form.controls.newImages.at(0).controls.caption.hasError('required'),
        ).toBe(false);
      });
    });

    describe('text validator', () => {
      it('should mark field with whitespace-only text as valid', () => {
        component.form.patchValue({ album: '   ' });
        component.form.controls.album.markAsTouched();
        fixture.detectChanges();

        expect(component.form.controls.album.hasError('invalidText')).toBe(false);
      });

      it('should mark field with emoji as valid', () => {
        component.form.patchValue({ album: '🔥' });
        component.form.markAllAsTouched();
        fixture.detectChanges();

        expect(component.form.controls.album.hasError('invalidText')).toBe(false);
      });

      it('should mark caption field with emoji as valid', () => {
        component.form.controls.newImages.at(0).patchValue({ caption: 'Żubrówka 🔥' });
        component.form.markAllAsTouched();
        fixture.detectChanges();

        expect(
          component.form.controls.newImages
            .at(0)
            .controls.caption.hasError('invalidText'),
        ).toBe(false);
      });

      it('should mark caption field with foreign characters as valid', () => {
        component.form.controls.newImages.at(0).patchValue({ caption: 'Żubrówka' });
        component.form.markAllAsTouched();
        fixture.detectChanges();

        expect(
          component.form.controls.newImages
            .at(0)
            .controls.caption.hasError('invalidText'),
        ).toBe(false);
      });

      it('should mark field with valid text as valid', () => {
        component.form.controls.newImages.at(0).patchValue({ caption: 'Absolut' });
        component.form.markAllAsTouched();
        fixture.detectChanges();

        expect(
          component.form.controls.newImages
            .at(0)
            .controls.caption.hasError('invalidText'),
        ).toBe(false);
      });
    });
  });

  describe('mostRecentModificationInfo', () => {
    it('should return most recently modified image from imageEntities', () => {
      component.imageEntities = MOCK_IMAGES.map(image => ({
        image,
        formData: pick(image, IMAGE_FORM_DATA_PROPERTIES),
      }));
      fixture.detectChanges();

      expect(component.mostRecentModificationInfo).toBe(MOCK_IMAGES[13].modificationInfo);
    });

    it('should return null if imageEntities is empty', () => {
      component.imageEntities = [];
      fixture.detectChanges();

      expect(component.mostRecentModificationInfo).toBeFalsy();
    });
  });

  describe('onSetAlbumCover', () => {
    it('should correctly set albumCover to false on current image and to true on new image', () => {
      // Images from the same album
      component.newImagesFormData = {
        [MOCK_IMAGES[1].id]: pick(MOCK_IMAGES[1], IMAGE_FORM_DATA_PROPERTIES),
        [MOCK_IMAGES[2].id]: pick(MOCK_IMAGES[2], IMAGE_FORM_DATA_PROPERTIES),
        [MOCK_IMAGES[5].id]: pick(MOCK_IMAGES[5], IMAGE_FORM_DATA_PROPERTIES), // Current album cover
      };
      fixture.detectChanges();
      component.ngOnInit();

      const newImagesControl = component.form.controls.newImages;
      expect(newImagesControl.at(0).controls.albumCover.value).toBe(false);
      expect(newImagesControl.at(1).controls.albumCover.value).toBe(false);
      expect(newImagesControl.at(2).controls.albumCover.value).toBe(true);

      component.onSetAlbumCover(MOCK_IMAGES[2].id);
      fixture.detectChanges();

      expect(newImagesControl.at(0).controls.albumCover.value).toBe(false);
      expect(newImagesControl.at(1).controls.albumCover.value).toBe(true);
      expect(newImagesControl.at(2).controls.albumCover.value).toBe(false);
    });
  });

  describe('onRemoveNewImage', () => {
    it('should delete image, update form, and set new album cover (if needed) if confirmed', async () => {
      dialogOpenSpy.mockResolvedValue('confirm');
      deleteImageSpy.mockResolvedValue('success');
      component.newImagesFormData = {
        [MOCK_IMAGES[1].id]: pick(MOCK_IMAGES[1], IMAGE_FORM_DATA_PROPERTIES),
        [MOCK_IMAGES[0].id]: pick(MOCK_IMAGES[0], IMAGE_FORM_DATA_PROPERTIES),
        [MOCK_IMAGES[3].id]: pick(MOCK_IMAGES[3], IMAGE_FORM_DATA_PROPERTIES),
      };
      component.newImageDataUrls = {
        [MOCK_IMAGES[1].id]: 'data:image/png;base64,abc',
        [MOCK_IMAGES[0].id]: 'data:image/png;base64,def',
        [MOCK_IMAGES[3].id]: 'data:image/jpeg;base64,xyz',
      };
      fixture.detectChanges();
      component.ngOnInit();

      // Initially image at index 1 is album cover
      const newImagesControl = component.form.controls.newImages;
      expect(component.form.controls.newImages.length).toBe(3);
      expect(newImagesControl.at(0).controls.albumCover.value).toBe(false);
      expect(newImagesControl.at(1).controls.albumCover.value).toBe(true);
      expect(newImagesControl.at(2).controls.albumCover.value).toBe(false);

      await component.onRemoveNewImage(newImagesControl.at(1).getRawValue(), 1);
      await fixture.whenStable();

      expect(component.form.controls.newImages.length).toBe(2);
      // Image at index 0 becomes new album cover
      expect(newImagesControl.at(0).controls.albumCover.value).toBe(true);

      expect(dialogOpenSpy).toHaveBeenCalledWith({
        componentType: BasicDialogComponent,
        isModal: false,
        inputs: {
          dialog: {
            title: 'Confirm',
            body: `Remove ${MOCK_IMAGES[0].filename}?`,
            confirmButtonText: 'Remove',
            confirmButtonType: 'warning',
          },
        },
      });

      expect(deleteImageSpy).toHaveBeenCalledTimes(1);
      expect(component.newImageDataUrls).not.toHaveProperty(MOCK_IMAGES[0].id);
      expect(removeNewImageSpy).toHaveBeenCalledWith(MOCK_IMAGES[0].id);
    });

    it('should handle errors from the imageFileService', async () => {
      const error: LccError = {
        name: 'LCCError' as const,
        message: 'Error deleting image',
      };
      dialogOpenSpy.mockResolvedValue('confirm');
      deleteImageSpy.mockResolvedValue(error);
      component.newImagesFormData = {
        [MOCK_IMAGES[0].id]: pick(MOCK_IMAGES[0], IMAGE_FORM_DATA_PROPERTIES),
      };
      fixture.detectChanges();
      component.ngOnInit();

      const newImagesControl = component.form.controls.newImages;
      await component.onRemoveNewImage(newImagesControl.at(0).getRawValue(), 0);
      await fixture.whenStable();

      expect(deleteImageSpy).toHaveBeenCalledWith(MOCK_IMAGES[0].id);
      expect(fileActionFailSpy).toHaveBeenCalledWith(error);
      expect(newImagesControl.length).toBe(1);
    });

    it('should not delete image if dialog is cancelled', async () => {
      dialogOpenSpy.mockResolvedValue('cancel');
      component.newImagesFormData = {
        [MOCK_IMAGES[0].id]: pick(MOCK_IMAGES[0], IMAGE_FORM_DATA_PROPERTIES),
      };
      fixture.detectChanges();
      component.ngOnInit();

      const newImagesControl = component.form.controls.newImages;
      await component.onRemoveNewImage(newImagesControl.at(0).getRawValue(), 0);
      await fixture.whenStable();

      expect(dialogOpenSpy).toHaveBeenCalledTimes(1);
      expect(deleteImageSpy).not.toHaveBeenCalled();
      expect(newImagesControl.length).toBe(1);
    });
  });

  describe('onChooseFiles', () => {
    it('should process a single file and update form values', async () => {
      const file = new File([':)'], 'new-file.1.png', { type: 'image/png' });
      const fileInputElement = document.createElement('input');
      Object.defineProperty(fileInputElement, 'files', {
        value: [file],
        writable: true,
      });
      const event = { target: fileInputElement };

      storeImageFileSpy.mockResolvedValue({
        id: 'new-7777',
        filename: 'new-file.1.png',
        dataUrl: 'data:image/png;base64,abc',
      });

      await component.onChooseFiles(event as unknown as Event);
      await fixture.whenStable();

      expect(uuidSpy).toHaveBeenCalledTimes(1);
      expect(storeImageFileSpy).toHaveBeenCalledTimes(1);
      expect(component.newImageDataUrls).toEqual({
        'new-7777': 'data:image/png;base64,abc',
      });
      expect(fileInputElement.value).toBe('');

      const newImagesControl = component.form.controls.newImages;
      expect(newImagesControl.at(0).controls.id.value).toBe('new-7777');
      expect(newImagesControl.at(0).controls.filename.value).toBe('new-file.1.png');
      expect(newImagesControl.at(0).controls.caption.value).toBe('new-file.1');
    });

    it('should process multiple files and update form values', async () => {
      const file1 = new File([':)'], 'new-file.1.png', { type: 'image/png' });
      const file2 = new File([':)'], 'new-file.2.jpg', { type: 'image/jpeg' });
      const fileInputElement = document.createElement('input');
      Object.defineProperty(fileInputElement, 'files', {
        value: [file1, file2],
        writable: true,
      });
      const event = { target: fileInputElement };

      storeImageFileSpy
        .mockResolvedValueOnce({
          id: 'new-7777',
          filename: 'new-file.1.png',
          dataUrl: 'data:image/png;base64,abc',
        })
        .mockResolvedValueOnce({
          id: 'new-8888',
          filename: 'new-file.2.jpg',
          dataUrl: 'data:image/jpeg;base64,xyz',
        });

      await component.onChooseFiles(event as unknown as Event);
      await fixture.whenStable();

      expect(uuidSpy).toHaveBeenCalledTimes(2);
      expect(storeImageFileSpy).toHaveBeenCalledTimes(2);
      expect(component.newImageDataUrls).toEqual({
        'new-7777': 'data:image/png;base64,abc',
        'new-8888': 'data:image/jpeg;base64,xyz',
      });
      expect(fileInputElement.value).toBe('');

      const newImagesControl = component.form.controls.newImages;
      expect(newImagesControl.at(0).controls.id.value).toBe('new-7777');
      expect(newImagesControl.at(0).controls.filename.value).toBe('new-file.1.png');
      expect(newImagesControl.at(0).controls.caption.value).toBe('new-file.1');
      expect(newImagesControl.at(1).controls.id.value).toBe('new-8888');
      expect(newImagesControl.at(1).controls.filename.value).toBe('new-file.2.jpg');
      expect(newImagesControl.at(1).controls.caption.value).toBe('new-file.2');
    });

    it('should process limit new image total to 20', async () => {
      component.newImagesFormData = [
        ...MOCK_IMAGES,
        ...MOCK_IMAGES.slice(0, 5).map(image => ({ ...image, id: `_${image.id}` })),
      ].reduce((acc: { [key: string]: ImageFormData }, image) => {
        acc[image.id] = pick(image, IMAGE_FORM_DATA_PROPERTIES);
        return acc;
      }, {}); // 19 images
      fixture.detectChanges();

      expect(Object.keys(component.newImagesFormData).length).toBe(19);

      const file20 = new File([':)'], 'new-file.20.jpg', { type: 'image/jpeg' });
      const file21 = new File([':)'], 'new-file.21.jpg', { type: 'image/jpeg' });
      const fileInputElement = document.createElement('input');
      Object.defineProperty(fileInputElement, 'files', {
        value: [file20, file21],
        writable: true,
      });
      const event = { target: fileInputElement };

      await component.onChooseFiles(event as unknown as Event);
      await fixture.whenStable();

      expect(Object.keys(component.newImagesFormData).length).toBe(19);
      expect(storeImageFileSpy).not.toHaveBeenCalled();
      expect(uuidSpy).not.toHaveBeenCalled();
      expect(fileInputElement.value).toBe('');
    });

    it('should handle other errors from the imageFileService', async () => {
      const file1 = new File([':)'], 'new-file.1.png', { type: 'image/png' });
      const file2 = new File([':('], 'new-file.2.tiff', { type: 'image/tiff' });
      const file3 = new File([':)'], 'new-file.3.jpg', { type: 'image/jpeg' });
      const fileInputElement = document.createElement('input');
      Object.defineProperty(fileInputElement, 'files', {
        value: [file1, file2, file3],
        writable: true,
      });
      const event = { target: fileInputElement };
      const error: LccError = {
        name: 'LCCError' as const,
        message: 'Error message',
      };

      storeImageFileSpy
        .mockResolvedValueOnce({
          id: 'new-123',
          filename: 'new-file.1.png',
          dataUrl: 'data:image/png;base64,abc',
        })
        .mockResolvedValueOnce(error)
        .mockResolvedValueOnce({
          id: 'new-456',
          filename: 'new-file.3.jpg',
          dataUrl: 'data:image/jpeg;base64,xyz',
        });

      await component.onChooseFiles(event as unknown as Event);
      await fixture.whenStable();

      expect(storeImageFileSpy).toHaveBeenCalledTimes(3);
      expect(fileActionFailSpy).toHaveBeenCalledWith(error);
      expect(fileInputElement.value).toBe('');

      const newImagesControl = component.form.controls.newImages;
      expect(newImagesControl.at(0).controls.id.value).toBe('new-123');
      expect(newImagesControl.at(0).controls.filename.value).toBe('new-file.1.png');
      expect(newImagesControl.at(0).controls.caption.value).toBe('new-file.1');
      expect(newImagesControl.at(1).controls.id.value).toBe('new-456');
      expect(newImagesControl.at(1).controls.filename.value).toBe('new-file.3.jpg');
      expect(newImagesControl.at(1).controls.caption.value).toBe('new-file.3');
    });

    it('should do nothing if no file is selected', async () => {
      const fileInputElement = document.createElement('input');
      Object.defineProperty(fileInputElement, 'files', {
        value: [],
        writable: true,
      });
      const event = { target: fileInputElement };

      await component.onChooseFiles(event as unknown as Event);
      fixture.detectChanges();

      expect(storeImageFileSpy).not.toHaveBeenCalled();
    });
  });

  describe('onRestore', () => {
    beforeEach(() => {
      component.hasUnsavedChanges = true;
      component.album = 'My Awesome Album';
      component.imageEntities = [
        {
          image: MOCK_IMAGES[0],
          formData: pick(MOCK_IMAGES[0], IMAGE_FORM_DATA_PROPERTIES),
        },
        {
          image: MOCK_IMAGES[1],
          formData: pick(MOCK_IMAGES[1], IMAGE_FORM_DATA_PROPERTIES),
        },
      ];
      component.newImageDataUrls = {
        [MOCK_IMAGES[2].id]: 'data:image/png;base64,abc',
        [MOCK_IMAGES[3].id]: 'data:image/jpeg;base64,xyz',
      };
      component.newImagesFormData = {
        [MOCK_IMAGES[2].id]: pick(MOCK_IMAGES[2], IMAGE_FORM_DATA_PROPERTIES),
        [MOCK_IMAGES[3].id]: pick(MOCK_IMAGES[3], IMAGE_FORM_DATA_PROPERTIES),
      };
      fixture.detectChanges();

      component.ngOnInit();

      component.form.controls.existingImages.at(0).patchValue({
        caption: 'Modified caption',
      });

      vi.clearAllMocks();
      vi.useFakeTimers();
    });

    afterEach(() => vi.useRealTimers());

    it('should emit both change and restore events and re-initialize form if dialog is confirmed', async () => {
      dialogOpenSpy.mockResolvedValue('confirm');

      await component.onRestore();
      vi.runAllTimers();

      expect(dialogOpenSpy).toHaveBeenCalledWith({
        componentType: BasicDialogComponent,
        isModal: false,
        inputs: {
          dialog: {
            title: 'Confirm',
            body: 'Restore original album data? All changes will be lost.',
            confirmButtonText: 'Restore',
            confirmButtonType: 'warning',
          },
        },
      });
      expect(changeSpy).toHaveBeenCalled();
      expect(restoreSpy).toHaveBeenCalledWith('My Awesome Album');
      expect(initFormSpy).toHaveBeenCalledTimes(1);
      expect(initFormValueChangeListenerSpy).toHaveBeenCalledTimes(1);
    });

    it('should not emit change or restore event or re-initialize form if dialog is cancelled', async () => {
      component.hasUnsavedChanges = true;
      dialogOpenSpy.mockResolvedValue('cancel');

      await component.onRestore();
      vi.runAllTimers();

      expect(dialogOpenSpy).toHaveBeenCalledTimes(1);
      expect(changeSpy).not.toHaveBeenCalled();
      expect(restoreSpy).not.toHaveBeenCalled();
      expect(initFormSpy).not.toHaveBeenCalled();
      expect(initFormValueChangeListenerSpy).not.toHaveBeenCalled();

      // Unchanged
      expect(component.form.controls.existingImages.at(0).controls.caption.value).toBe(
        'Modified caption',
      );
    });
  });

  describe('onCancel', () => {
    it('should emit cancel event', () => {
      component.onCancel();
      expect(cancelSpy).toHaveBeenCalled();
    });
  });

  describe('onSubmit', () => {
    it('should mark all fields as touched if form is invalid on submit', async () => {
      component.form.patchValue({ album: '' }); // Invalid - album field is required
      component.form.markAsPristine();
      component.form.markAsUntouched();
      fixture.detectChanges();

      await component.onSubmit();

      expect(component.form.controls.album.touched).toBe(true);
      expect(component.form.touched).toBe(true);
      expect(dialogOpenSpy).not.toHaveBeenCalled();
    });

    it('should open confirmation dialog with correct data and emit request add images event if adding a new image', async () => {
      dialogOpenSpy.mockResolvedValue('confirm');
      component.newImagesFormData = { [MOCK_IMAGES[3].id]: MOCK_IMAGES[3] };
      fixture.detectChanges();
      component.ngOnInit(); // Initialize form with newImagesFormData

      await component.onSubmit();

      expect(dialogOpenSpy).toHaveBeenCalledWith({
        componentType: BasicDialogComponent,
        isModal: false,
        inputs: {
          dialog: {
            title: 'Confirm',
            body: 'Create new album with this 1 new image?',
            confirmButtonText: 'Create',
          },
        },
      });
      expect(requestAddImagesSpy).toHaveBeenCalled();
    });

    it('should open confirmation dialog with correct data and emit request update album event if updating the album', async () => {
      dialogOpenSpy.mockResolvedValue('confirm');
      component.album = MOCK_IMAGES[3].album;
      component.imageEntities = [
        {
          image: MOCK_IMAGES[3],
          formData: pick(MOCK_IMAGES[3], IMAGE_FORM_DATA_PROPERTIES),
        },
      ];
      fixture.detectChanges();
      component.ngOnInit(); // Initialize form with imageEntities

      await component.onSubmit();

      expect(dialogOpenSpy).toHaveBeenCalledWith({
        componentType: BasicDialogComponent,
        isModal: false,
        inputs: {
          dialog: {
            title: 'Confirm',
            body: `Update ${MOCK_IMAGES[3].album}?`,
            confirmButtonText: 'Update',
          },
        },
      });
      expect(requestUpdateAlbumSpy).toHaveBeenCalledWith(MOCK_IMAGES[3].album);
    });

    it('should not emit add or update events if dialog is cancelled', async () => {
      dialogOpenSpy.mockResolvedValue('cancel');
      component.hasUnsavedChanges = true;
      component.newImagesFormData = { [MOCK_IMAGES[3].id]: MOCK_IMAGES[3] };
      component.form.patchValue(pick(MOCK_IMAGES[3], IMAGE_FORM_DATA_PROPERTIES));
      fixture.detectChanges();

      await component.onSubmit();

      expect(dialogOpenSpy).toHaveBeenCalledTimes(1);
      expect(requestAddImagesSpy).not.toHaveBeenCalled();
      expect(requestUpdateAlbumSpy).not.toHaveBeenCalled();
    });
  });

  describe('template rendering', () => {
    describe('modification info', () => {
      it('should render if imageEntity is defined', () => {
        fixture.componentRef.setInput('imageEntities', [
          {
            image: MOCK_IMAGES[0],
            formData: pick(MOCK_IMAGES[0], IMAGE_FORM_DATA_PROPERTIES),
          },
        ]);
        fixture.detectChanges();

        expect(query(fixture.debugElement, 'lcc-modification-info')).toBeTruthy();
      });

      it('should not render if imageEntity is null', () => {
        fixture.componentRef.setInput('imageEntities', []);
        fixture.detectChanges();

        expect(query(fixture.debugElement, 'lcc-modification-info')).toBeFalsy();
      });
    });

    describe('new images header', () => {
      it('should render if album is defined', () => {
        fixture.componentRef.setInput('album', 'My album');
        fixture.detectChanges();

        expect(queryTextContent(fixture.debugElement, '.new-images-header')).toBe(
          'New images',
        );
      });

      it('should not render if album is empty', () => {
        fixture.componentRef.setInput('album', '');
        fixture.detectChanges();

        expect(query(fixture.debugElement, '.new-images-header')).toBeFalsy();
      });
    });

    describe('restore button', () => {
      it('should be disabled if there are no unsaved changes', () => {
        fixture.componentRef.setInput('hasUnsavedChanges', false);
        fixture.detectChanges();

        expect(
          query(fixture.debugElement, '.restore-button').nativeElement.disabled,
        ).toBe(true);
      });

      it('should be enabled if there are unsaved changes', () => {
        fixture.componentRef.setInput('hasUnsavedChanges', true);
        fixture.detectChanges();

        expect(
          query(fixture.debugElement, '.restore-button').nativeElement.disabled,
        ).toBe(false);
      });
    });

    describe('cancel button', () => {
      it('should be enabled if there are unsaved changes', () => {
        fixture.componentRef.setInput('hasUnsavedChanges', true);
        fixture.detectChanges();

        const cancelButton = query(fixture.debugElement, '.cancel-button');
        cancelButton.triggerEventHandler('click');

        expect(cancelButton.nativeElement.disabled).toBe(false);
        expect(cancelSpy).toHaveBeenCalledTimes(1);
      });

      it('should also be enabled if there are no unsaved changes', () => {
        fixture.componentRef.setInput('hasUnsavedChanges', false);
        fixture.detectChanges();

        const cancelButton = query(fixture.debugElement, '.cancel-button');
        cancelButton.triggerEventHandler('click');

        expect(cancelButton.nativeElement.disabled).toBe(false);
        expect(cancelSpy).toHaveBeenCalledTimes(1);
      });
    });

    describe('submit button', () => {
      it('should be disabled if there are no unsaved changes', () => {
        fixture.componentRef.setInput('newImagesFormData', {
          [MOCK_IMAGES[3].id]: MOCK_IMAGES[3],
        });
        fixture.componentRef.setInput('hasUnsavedChanges', false);
        fixture.detectChanges();
        component.ngOnInit(); // Initialize form with newImagesFormData

        const submitButton = query(fixture.debugElement, '.submit-button');
        expect(submitButton.nativeElement.disabled).toBe(true);
      });

      it('should be disabled if the form is invalid', () => {
        fixture.componentRef.setInput('newImagesFormData', {
          [MOCK_IMAGES[0].id]: {
            ...MOCK_IMAGES[0],
            caption: '', // Invalid - required field
          },
        });
        fixture.componentRef.setInput('hasUnsavedChanges', true);
        fixture.detectChanges();
        component.ngOnInit(); // Initialize form with newImagesFormData

        const submitButton = query(fixture.debugElement, '.submit-button');
        expect(submitButton.nativeElement.disabled).toBe(true);
      });

      it('should be enabled if there are unsaved changes and the form is valid', () => {
        fixture.componentRef.setInput('newImagesFormData', {
          [MOCK_IMAGES[3].id]: MOCK_IMAGES[3],
        });
        fixture.componentRef.setInput('hasUnsavedChanges', true);
        component.ngOnInit();
        fixture.detectChanges();

        query(fixture.debugElement, 'form').triggerEventHandler('ngSubmit');

        const submitButton = query(fixture.debugElement, '.submit-button');
        expect(submitButton.nativeElement.disabled).toBe(false);
        expect(submitSpy).toHaveBeenCalledTimes(1);
      });
    });
  });
});
