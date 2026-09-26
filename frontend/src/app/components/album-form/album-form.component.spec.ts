import { provideMockStore } from '@ngrx/store/testing';
import { pick } from 'lodash';

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { By } from '@angular/platform-browser';

import { BasicDialogComponent } from '@app/components/basic-dialog/basic-dialog.component';
import { IMAGE_FORM_DATA_PROPERTIES } from '@app/constants';
import { MOCK_IMAGES } from '@app/mocks/images.mock';
import { ImageFormData, LccError } from '@app/models';
import { DialogService, ImageFileService, StoreRequestService } from '@app/services';
import { ImagesActions } from '@app/store/images';
import { initialState as membersInitialState } from '@app/store/members/members.reducer';
import { GENERATE_UUID } from '@app/tokens';
import { lastOpenedDialog, query, queryTextContent } from '@app/utils';

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
  let fileActionFailSpy: MockInstance;
  let getAllImagesSpy: MockInstance;
  let removeNewImageSpy: MockInstance;
  let storeRequestSpy: Mock;
  let restoreSpy: MockInstance;
  let storeImageFileSpy: MockInstance;
  let submitSpy: MockInstance;
  let uuidSpy: MockInstance;

  const fileEvent = (
    files: File[],
  ): { event: Event; fileInputElement: HTMLInputElement } => {
    const fileInputElement = document.createElement('input');
    Object.defineProperty(fileInputElement, 'files', { value: files, writable: true });
    const event = new Event('change');
    Object.defineProperty(event, 'target', { value: fileInputElement });
    return { event, fileInputElement };
  };

  const entitiesOf = (...indices: number[]) =>
    indices.map(index => ({
      image: MOCK_IMAGES[index],
      formData: pick(MOCK_IMAGES[index], IMAGE_FORM_DATA_PROPERTIES),
    }));

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
        {
          provide: StoreRequestService,
          useValue: { dispatch: vi.fn().mockResolvedValue(null) },
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
    fileActionFailSpy = vi.spyOn(component.fileActionFail, 'emit');
    getAllImagesSpy = vi.spyOn(imageFileService, 'getAllImages');
    removeNewImageSpy = vi.spyOn(component.removeNewImage, 'emit');
    storeRequestSpy = vi.mocked(TestBed.inject(StoreRequestService).dispatch);
    restoreSpy = vi.spyOn(component.restore, 'emit');
    storeImageFileSpy = vi.spyOn(imageFileService, 'storeImageFile');
    submitSpy = vi.spyOn(component, 'onSubmit');
    uuidSpy = TestBed.inject(GENERATE_UUID) as Mock;

    fixture.componentRef.setInput('album', null);
    fixture.componentRef.setInput('existingAlbums', []);
    fixture.componentRef.setInput('hasUnsavedChanges', false);
    fixture.componentRef.setInput('imageEntities', []);
    fixture.componentRef.setInput('newImagesFormData', {});

    fixture.detectChanges();
  });

  describe('form initialization', () => {
    describe('if both imageEntities and newImagesFormData are empty', () => {
      beforeEach(() => {
        vi.clearAllMocks();
        component.ngOnInit();
      });

      it('should initialize the form with empty, untouched values', () => {
        expect(component.form.controls.album.value).toBe('');
        expect(component.form.controls.existingImages.value).toStrictEqual([]);
        expect(component.form.controls.newImages.value).toStrictEqual([]);

        expect(component.form.controls.album.untouched).toBe(true);
        expect(component.form.controls.existingImages.untouched).toBe(true);
        expect(component.form.controls.newImages.untouched).toBe(true);
      });

      it('should not fetch any new image data', () => {
        expect(getAllImagesSpy).not.toHaveBeenCalled();
      });
    });

    describe('if imageEntities is empty and newImagesFormData contains data', () => {
      beforeEach(async () => {
        vi.clearAllMocks();
        // Two images from the same album
        fixture.componentRef.setInput('newImagesFormData', {
          [MOCK_IMAGES[0].id]: pick(MOCK_IMAGES[0], IMAGE_FORM_DATA_PROPERTIES),
          [MOCK_IMAGES[3].id]: pick(MOCK_IMAGES[3], IMAGE_FORM_DATA_PROPERTIES),
        });

        component.ngOnInit();
        await fixture.whenStable();
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

      it('should load the previews of the new images', () => {
        expect(getAllImagesSpy).toHaveBeenCalledTimes(1);
        expect(component.newImageDataUrls).toEqual({
          'new-123': 'data:image/png;base64,abc',
          'new-456': 'data:image/jpeg;base64,xyz',
        });
      });

      it('should report new image previews that fail to load', async () => {
        const error: LccError = { name: 'LCCError', message: 'Could not read images.' };
        getAllImagesSpy.mockResolvedValue(error);

        component.ngOnInit();
        await fixture.whenStable();

        expect(fileActionFailSpy).toHaveBeenCalledWith(error);
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

      it('should not fetch any new image data', () => {
        expect(getAllImagesSpy).not.toHaveBeenCalled();
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

      it('should not fetch any new image data', () => {
        expect(getAllImagesSpy).not.toHaveBeenCalled();
      });
    });
  });

  describe('form validation', () => {
    beforeEach(() => {
      // Two images from the same album
      fixture.componentRef.setInput('newImagesFormData', {
        [MOCK_IMAGES[0].id]: pick(MOCK_IMAGES[0], IMAGE_FORM_DATA_PROPERTIES),
        [MOCK_IMAGES[3].id]: pick(MOCK_IMAGES[3], IMAGE_FORM_DATA_PROPERTIES),
      });
      fixture.detectChanges();

      component.ngOnInit();
    });

    it('should require a caption', () => {
      component.form.controls.newImages.at(0).patchValue({ caption: '' });

      expect(
        component.form.controls.newImages.at(0).controls.caption.hasError('required'),
      ).toBe(true);
    });

    it('should reject a caption or ordinality in an invalid format', () => {
      const image = component.form.controls.newImages.at(0);

      image.patchValue({ caption: 'Bell \u0007', albumOrdinality: '0' });

      expect(image.controls.caption.hasError('invalidText')).toBe(true);
      expect(image.controls.albumOrdinality.hasError('invalidOrdinal')).toBe(true);
    });
  });

  describe('mostRecentModificationInfo', () => {
    it('should return most recently modified image from imageEntities', () => {
      fixture.componentRef.setInput(
        'imageEntities',
        MOCK_IMAGES.map(image => ({
          image,
          formData: pick(image, IMAGE_FORM_DATA_PROPERTIES),
        })),
      );
      fixture.detectChanges();

      expect(component.mostRecentModificationInfo).toBe(MOCK_IMAGES[13].modificationInfo);
    });

    it('should return null if imageEntities is empty', () => {
      fixture.componentRef.setInput('imageEntities', []);
      fixture.detectChanges();

      expect(component.mostRecentModificationInfo).toBeFalsy();
    });
  });

  describe('onSetAlbumCover', () => {
    it('should correctly set albumCover to false on current image and to true on new image', () => {
      // Images from the same album
      fixture.componentRef.setInput('newImagesFormData', {
        [MOCK_IMAGES[1].id]: pick(MOCK_IMAGES[1], IMAGE_FORM_DATA_PROPERTIES),
        [MOCK_IMAGES[2].id]: pick(MOCK_IMAGES[2], IMAGE_FORM_DATA_PROPERTIES),
        [MOCK_IMAGES[5].id]: pick(MOCK_IMAGES[5], IMAGE_FORM_DATA_PROPERTIES), // Current album cover
      });
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
      fixture.componentRef.setInput('newImagesFormData', {
        [MOCK_IMAGES[1].id]: pick(MOCK_IMAGES[1], IMAGE_FORM_DATA_PROPERTIES),
        [MOCK_IMAGES[0].id]: pick(MOCK_IMAGES[0], IMAGE_FORM_DATA_PROPERTIES),
        [MOCK_IMAGES[3].id]: pick(MOCK_IMAGES[3], IMAGE_FORM_DATA_PROPERTIES),
      });
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
      fixture.componentRef.setInput('newImagesFormData', {
        [MOCK_IMAGES[0].id]: pick(MOCK_IMAGES[0], IMAGE_FORM_DATA_PROPERTIES),
      });
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
      fixture.componentRef.setInput('newImagesFormData', {
        [MOCK_IMAGES[0].id]: pick(MOCK_IMAGES[0], IMAGE_FORM_DATA_PROPERTIES),
      });
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
      const { event, fileInputElement } = fileEvent([file]);

      storeImageFileSpy.mockResolvedValue({
        id: 'new-7777',
        filename: 'new-file.1.png',
        dataUrl: 'data:image/png;base64,abc',
      });

      await component.onChooseFiles(event);
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
      const { event, fileInputElement } = fileEvent([file1, file2]);

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

      await component.onChooseFiles(event);
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
      fixture.componentRef.setInput(
        'newImagesFormData',
        [
          ...MOCK_IMAGES,
          ...MOCK_IMAGES.slice(0, 5).map(image => ({ ...image, id: `_${image.id}` })),
        ].reduce((acc: { [key: string]: ImageFormData }, image) => {
          acc[image.id] = pick(image, IMAGE_FORM_DATA_PROPERTIES);
          return acc;
        }, {}),
      ); // 19 images
      fixture.detectChanges();

      expect(Object.keys(component.newImagesFormData()).length).toBe(19);

      const file20 = new File([':)'], 'new-file.20.jpg', { type: 'image/jpeg' });
      const file21 = new File([':)'], 'new-file.21.jpg', { type: 'image/jpeg' });
      const { event, fileInputElement } = fileEvent([file20, file21]);

      await component.onChooseFiles(event);
      await fixture.whenStable();

      expect(Object.keys(component.newImagesFormData()).length).toBe(19);
      expect(storeImageFileSpy).not.toHaveBeenCalled();
      expect(uuidSpy).not.toHaveBeenCalled();
      expect(fileInputElement.value).toBe('');
    });

    it('should handle other errors from the imageFileService', async () => {
      const file1 = new File([':)'], 'new-file.1.png', { type: 'image/png' });
      const file2 = new File([':('], 'new-file.2.tiff', { type: 'image/tiff' });
      const file3 = new File([':)'], 'new-file.3.jpg', { type: 'image/jpeg' });
      const { event, fileInputElement } = fileEvent([file1, file2, file3]);
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

      await component.onChooseFiles(event);
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
      const { event } = fileEvent([]);

      await component.onChooseFiles(event);
      fixture.detectChanges();

      expect(storeImageFileSpy).not.toHaveBeenCalled();
    });
  });

  describe('onRestore', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('hasUnsavedChanges', true);
      fixture.componentRef.setInput('album', 'My Awesome Album');
      fixture.componentRef.setInput('imageEntities', [
        {
          image: MOCK_IMAGES[0],
          formData: pick(MOCK_IMAGES[0], IMAGE_FORM_DATA_PROPERTIES),
        },
        {
          image: MOCK_IMAGES[1],
          formData: pick(MOCK_IMAGES[1], IMAGE_FORM_DATA_PROPERTIES),
        },
      ]);
      component.newImageDataUrls = {
        [MOCK_IMAGES[2].id]: 'data:image/png;base64,abc',
        [MOCK_IMAGES[3].id]: 'data:image/jpeg;base64,xyz',
      };
      fixture.componentRef.setInput('newImagesFormData', {
        [MOCK_IMAGES[2].id]: pick(MOCK_IMAGES[2], IMAGE_FORM_DATA_PROPERTIES),
        [MOCK_IMAGES[3].id]: pick(MOCK_IMAGES[3], IMAGE_FORM_DATA_PROPERTIES),
      });
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
      expect(component.form.controls.existingImages.at(0).controls.caption.value).toBe(
        MOCK_IMAGES[0].caption,
      );
    });

    it('should not emit change or restore event or re-initialize form if dialog is cancelled', async () => {
      dialogOpenSpy.mockResolvedValue('cancel');

      await component.onRestore();
      vi.runAllTimers();

      expect(dialogOpenSpy).toHaveBeenCalledTimes(1);
      expect(changeSpy).not.toHaveBeenCalled();
      expect(restoreSpy).not.toHaveBeenCalled();
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

    it('should create a new album from the confirmation dialog', async () => {
      fixture.componentRef.setInput('newImagesFormData', {
        [MOCK_IMAGES[3].id]: MOCK_IMAGES[3],
      });
      fixture.detectChanges();
      component.ngOnInit(); // Initialize form with newImagesFormData

      await component.onSubmit();
      await lastOpenedDialog(dialogOpenSpy).confirmAction?.();

      expect(dialogOpenSpy).toHaveBeenCalledWith({
        componentType: BasicDialogComponent,
        isModal: false,
        inputs: {
          dialog: expect.objectContaining({
            title: 'Confirm',
            body: 'Create new album with this 1 new image?',
            confirmButtonText: 'Create',
          }),
        },
      });
      expect(storeRequestSpy).toHaveBeenCalledWith(ImagesActions.addImagesRequested(), [
        ImagesActions.addImagesSucceeded,
        ImagesActions.addImagesFailed,
      ]);
    });

    it('should update an existing album from the confirmation dialog', async () => {
      fixture.componentRef.setInput('album', MOCK_IMAGES[3].album);
      fixture.componentRef.setInput('imageEntities', [
        {
          image: MOCK_IMAGES[3],
          formData: pick(MOCK_IMAGES[3], IMAGE_FORM_DATA_PROPERTIES),
        },
      ]);
      fixture.detectChanges();
      component.ngOnInit(); // Initialize form with imageEntities

      await component.onSubmit();
      await lastOpenedDialog(dialogOpenSpy).confirmAction?.();

      expect(dialogOpenSpy).toHaveBeenCalledWith({
        componentType: BasicDialogComponent,
        isModal: false,
        inputs: {
          dialog: expect.objectContaining({
            title: 'Confirm',
            body: `Update ${MOCK_IMAGES[3].album}?`,
            confirmButtonText: 'Update',
          }),
        },
      });
      expect(storeRequestSpy).toHaveBeenCalledWith(
        ImagesActions.updateAlbumRequested({ album: MOCK_IMAGES[3].album }),
        [ImagesActions.updateAlbumSucceeded, ImagesActions.updateAlbumFailed],
      );
    });

    it('should not save anything until the dialog is confirmed', async () => {
      dialogOpenSpy.mockResolvedValue('cancel');
      fixture.componentRef.setInput('hasUnsavedChanges', true);
      fixture.componentRef.setInput('newImagesFormData', {
        [MOCK_IMAGES[3].id]: MOCK_IMAGES[3],
      });
      component.form.patchValue(pick(MOCK_IMAGES[3], IMAGE_FORM_DATA_PROPERTIES));
      fixture.detectChanges();

      await component.onSubmit();

      expect(dialogOpenSpy).toHaveBeenCalledTimes(1);
      expect(storeRequestSpy).not.toHaveBeenCalled();
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

  describe('existing images', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('album', MOCK_IMAGES[1].album);
      fixture.componentRef.setInput('imageEntities', entitiesOf(1, 2));
      component.ngOnInit();
      fixture.detectChanges();
    });

    it('should show each image with its own fields', () => {
      expect(
        fixture.debugElement
          .queryAll(By.css('lcc-image'))
          .map(image => image.componentInstance.image()),
      ).toEqual([MOCK_IMAGES[1], MOCK_IMAGES[2]]);
    });

    it('should make the chosen existing image the only album cover', () => {
      const radios = fixture.debugElement.queryAll(By.css('.cover-image-input'));

      radios[1].triggerEventHandler('change');

      expect(
        component.form.controls.existingImages.controls.map(
          control => control.controls.albumCover.value,
        ),
      ).toEqual([false, true]);
    });

    it('should pass the album cover to an existing image when the new cover is removed', async () => {
      dialogOpenSpy.mockResolvedValue('confirm');
      deleteImageSpy.mockResolvedValue('success');
      component.form.controls.existingImages.at(0).controls.albumCover.setValue(false);
      const { event } = fileEvent([new File([':)'], 'cover.png')]);
      storeImageFileSpy.mockResolvedValue({
        id: 'new-1',
        filename: 'cover.png',
        dataUrl: 'data:image/png;base64,abc',
      });
      await component.onChooseFiles(event);
      await fixture.whenStable();
      component.onSetAlbumCover('new-1');

      await component.onRemoveNewImage(
        component.form.controls.newImages.at(0).getRawValue(),
        0,
      );

      expect(component.form.controls.existingImages.at(0).controls.albumCover.value).toBe(
        true,
      );
    });

    it('should ask to upload the new images along with the album update', async () => {
      const { event } = fileEvent([new File([':)'], 'a.png'), new File([':)'], 'b.png')]);
      storeImageFileSpy
        .mockResolvedValueOnce({ id: 'new-1', filename: 'a.png', dataUrl: 'data:,a' })
        .mockResolvedValueOnce({ id: 'new-2', filename: 'b.png', dataUrl: 'data:,b' });
      await component.onChooseFiles(event);
      await fixture.whenStable();

      await component.onSubmit();

      expect(lastOpenedDialog(dialogOpenSpy).body).toBe(
        `Update ${MOCK_IMAGES[1].album} and upload these 2 new images?`,
      );
    });
  });

  describe('new images', () => {
    beforeEach(async () => {
      fixture.componentRef.setInput('newImagesFormData', {
        'new-123': { ...pick(MOCK_IMAGES[0], IMAGE_FORM_DATA_PROPERTIES), id: 'new-123' },
        'new-456': { ...pick(MOCK_IMAGES[3], IMAGE_FORM_DATA_PROPERTIES), id: 'new-456' },
      });
      component.ngOnInit();
      await fixture.whenStable();
      fixture.detectChanges();
    });

    it('should preview each new image', () => {
      expect(
        fixture.debugElement
          .queryAll(By.css('.image-container img'))
          .map(image => image.nativeElement.getAttribute('src')),
      ).toEqual(['data:image/png;base64,abc', 'data:image/jpeg;base64,xyz']);
    });

    it('should make the chosen new image the only album cover', () => {
      const radios = fixture.debugElement.queryAll(By.css('.album-cover-input'));

      radios[1].triggerEventHandler('change');

      expect(
        component.form.controls.newImages.controls.map(
          control => control.controls.albumCover.value,
        ),
      ).toEqual([false, true]);
    });

    it('should ask before removing a new image', () => {
      dialogOpenSpy.mockResolvedValue('cancel');

      query(fixture.debugElement, '.remove-image-button').triggerEventHandler('click');

      expect(lastOpenedDialog(dialogOpenSpy).body).toBe(
        `Remove ${MOCK_IMAGES[0].filename}?`,
      );
    });
  });

  describe('file input', () => {
    it('should add the chosen files as new images', async () => {
      const { event } = fileEvent([new File([':)'], 'board.png')]);
      storeImageFileSpy.mockResolvedValue({
        id: 'new-1',
        filename: 'board.png',
        dataUrl: 'data:image/png;base64,abc',
      });

      query(fixture.debugElement, 'input[type="file"]').triggerEventHandler(
        'change',
        event,
      );
      await fixture.whenStable();

      expect(component.form.controls.newImages.at(0).controls.id.value).toBe('new-1');
    });

    it('should keep a cancelled file choice from closing the surrounding dialog', () => {
      const event = new Event('cancel');
      const stopPropagationSpy = vi.spyOn(event, 'stopPropagation');

      query(fixture.debugElement, 'input[type="file"]').triggerEventHandler(
        'cancel',
        event,
      );

      expect(stopPropagationSpy).toHaveBeenCalled();
    });
  });

  it('should ask before restoring from the restore button', () => {
    dialogOpenSpy.mockResolvedValue('cancel');
    fixture.componentRef.setInput('hasUnsavedChanges', true);
    fixture.detectChanges();

    query(fixture.debugElement, '.restore-button').triggerEventHandler('click');

    expect(lastOpenedDialog(dialogOpenSpy).confirmButtonText).toBe('Restore');
  });

  it('should save nothing for an album with no images', async () => {
    component.form.controls.album.setValue('Empty album');

    await component.onSubmit();
    const result = await lastOpenedDialog(dialogOpenSpy).confirmAction?.();

    expect(result).toBeNull();
    expect(storeRequestSpy).not.toHaveBeenCalled();
  });
});
