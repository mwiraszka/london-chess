import { ButtonComponent, DialogService, FileUploaderComponent } from '@eagami/ui';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { pick } from 'lodash';

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BasicDialogComponent } from '@app/components/basic-dialog/basic-dialog.component';
import { IMAGE_FORM_DATA_PROPERTIES } from '@app/constants';
import { FORM_CHANGE_DEBOUNCE, FORM_ERROR_MESSAGES } from '@app/constants/forms';
import { MAX_NEW_IMAGES } from '@app/constants/images';
import { MOCK_IMAGES } from '@app/mocks/images.mock';
import { Image, ImageFormData, LccError } from '@app/models';
import { ImageFileService, StoreRequestService } from '@app/services';
import { ImagesActions } from '@app/store/images';
import { initialState as imagesInitialState } from '@app/store/images/images.reducer';
import { initialState as membersInitialState } from '@app/store/members/members.reducer';
import { GENERATE_UUID } from '@app/tokens';
import {
  closedDialogRef,
  lastOpenedDialog,
  query,
  queryAll,
  queryTextContent,
} from '@app/utils';

import { AlbumFormComponent } from './album-form.component';

describe('AlbumFormComponent', () => {
  let fixture: ComponentFixture<AlbumFormComponent>;
  let component: AlbumFormComponent;

  let cancelSpy: MockInstance;
  let changeSpy: MockInstance;
  let deleteImageSpy: Mock;
  let dialogOpenSpy: Mock;
  let fileActionFailSpy: MockInstance;
  let getAllImagesSpy: Mock;
  let removeNewImageSpy: MockInstance;
  let restoreSpy: MockInstance;
  let storeImageFileSpy: Mock;
  let storeRequestSpy: Mock;

  // John's Images, with the first image as its cover
  const album = MOCK_IMAGES[0].album;

  const entitiesOf = (
    ...indices: number[]
  ): { image: Image; formData: ImageFormData }[] =>
    indices.map(index => ({
      image: MOCK_IMAGES[index],
      formData: pick(MOCK_IMAGES[index], IMAGE_FORM_DATA_PROPERTIES),
    }));

  const newImagesOf = (...indices: number[]): Record<string, ImageFormData> =>
    Object.fromEntries(
      indices.map(index => [
        `new-${index}`,
        { ...pick(MOCK_IMAGES[index], IMAGE_FORM_DATA_PROPERTIES), id: `new-${index}` },
      ]),
    );

  const board = (name: string): File => new File([':)'], name, { type: 'image/png' });

  function render(
    albumName: string | null = null,
    imageEntities: { image: Image; formData: ImageFormData }[] = [],
    newImagesFormData: Record<string, ImageFormData> = {},
    hasUnsavedChanges = false,
  ): void {
    fixture = TestBed.createComponent(AlbumFormComponent);
    component = fixture.componentInstance;
    cancelSpy = vi.spyOn(component.cancel, 'emit');
    changeSpy = vi.spyOn(component.change, 'emit');
    fileActionFailSpy = vi.spyOn(component.fileActionFail, 'emit');
    removeNewImageSpy = vi.spyOn(component.removeNewImage, 'emit');
    restoreSpy = vi.spyOn(component.restore, 'emit');

    fixture.componentRef.setInput('album', albumName);
    fixture.componentRef.setInput('existingAlbums', [album]);
    fixture.componentRef.setInput('hasUnsavedChanges', hasUnsavedChanges);
    fixture.componentRef.setInput('imageEntities', imageEntities);
    fixture.componentRef.setInput('newImagesFormData', newImagesFormData);
    fixture.detectChanges();
  }

  async function settle(): Promise<void> {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  const lastDraft = (): Partial<ImageFormData>[] =>
    changeSpy.mock.lastCall?.[0].multipleFormData;

  const button = (selector: string): ButtonComponent =>
    query(fixture.debugElement, selector).componentInstance;

  const uploader = (): FileUploaderComponent =>
    query(fixture.debugElement, 'ea-file-uploader').componentInstance;

  const errorTexts = (): string[] =>
    Array.from<HTMLElement>(fixture.nativeElement.querySelectorAll('[role="alert"]')).map(
      element => element.textContent?.trim() ?? '',
    );

  const covers = (): boolean[] =>
    [
      ...component.form.controls.existingImages.controls,
      ...component.form.controls.newImages.controls,
    ].map(control => control.controls.albumCover.value);

  const previews = (): string[] =>
    queryAll(fixture.debugElement, '.image-container > img').map(image =>
      image.nativeElement.getAttribute('src'),
    );

  // Picks files the way the browser hands them to the uploader's hidden file input
  const pickFiles = (files: File[]): void => {
    const fileInput: HTMLInputElement = query(
      fixture.debugElement,
      'ea-file-uploader input[type="file"]',
    ).nativeElement;
    Object.defineProperty(fileInput, 'files', { value: files, configurable: true });
    fileInput.dispatchEvent(new Event('change'));
  };

  const storedFiles = async (): Promise<void> => {
    await Promise.all(storeImageFileSpy.mock.results.map(({ value }) => value));
    fixture.detectChanges();
  };

  const clickCover = (index: number): void => {
    queryAll(fixture.debugElement, 'ea-radio input[type="radio"]')[
      index
    ].nativeElement.dispatchEvent(new Event('change'));
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AlbumFormComponent],
      providers: [
        provideMockStore({
          initialState: {
            imagesState: imagesInitialState,
            membersState: membersInitialState,
          },
        }),
        { provide: GENERATE_UUID, useValue: vi.fn(() => 'uuid') },
        { provide: DialogService, useValue: { open: vi.fn(() => closedDialogRef()) } },
        {
          provide: ImageFileService,
          useValue: {
            storeImageFile: vi.fn(),
            getAllImages: vi.fn(),
            deleteImage: vi.fn(),
          },
        },
        {
          provide: StoreRequestService,
          useValue: { dispatch: vi.fn().mockResolvedValue(null) },
        },
      ],
    }).compileComponents();

    const imageFileService = TestBed.inject(ImageFileService);
    deleteImageSpy = vi.mocked(imageFileService.deleteImage);
    dialogOpenSpy = vi.mocked(TestBed.inject(DialogService).open);
    getAllImagesSpy = vi.mocked(imageFileService.getAllImages);
    storeImageFileSpy = vi.mocked(imageFileService.storeImageFile);
    storeRequestSpy = vi.mocked(TestBed.inject(StoreRequestService).dispatch);

    deleteImageSpy.mockResolvedValue('success');
    getAllImagesSpy.mockResolvedValue([
      { id: 'new-0', filename: 'image1.jpg', dataUrl: 'data:image/jpeg;base64,abc' },
      { id: 'new-3', filename: 'image4.jpg', dataUrl: 'data:image/jpeg;base64,xyz' },
    ]);
    storeImageFileSpy.mockImplementation(async (id: string, file: File) => ({
      id: `${id}-${file.name}`,
      filename: file.name,
      dataUrl: `data:image/png;base64,${file.name}`,
    }));
  });

  describe('initialization', () => {
    it('should start a new album empty, with nothing to load', () => {
      render();

      expect(component.form.getRawValue()).toEqual({
        album: '',
        existingImages: [],
        newImages: [],
      });
      expect(getAllImagesSpy).not.toHaveBeenCalled();
    });

    it('should fill each image of an existing album from its draft', () => {
      const [first, second] = entitiesOf(0, 3);

      render(album, [
        first,
        { ...second, formData: { ...second.formData, caption: 'Moved' } },
      ]);

      expect(component.form.controls.album.value).toBe(album);
      expect(component.form.controls.existingImages.getRawValue()).toEqual([
        pick(MOCK_IMAGES[0], [
          'id',
          'filename',
          'caption',
          'albumOrdinality',
          'albumCover',
        ]),
        {
          ...pick(MOCK_IMAGES[3], [
            'id',
            'filename',
            'caption',
            'albumOrdinality',
            'albumCover',
          ]),
          caption: 'Moved',
        },
      ]);
      expect(getAllImagesSpy).not.toHaveBeenCalled();
    });

    it('should pick up new images with their stored previews', async () => {
      render(null, [], newImagesOf(0, 3), true);

      await getAllImagesSpy.mock.results[0].value;
      fixture.detectChanges();

      expect(component.form.controls.album.value).toBe(album);
      expect(component.form.controls.newImages.length).toBe(2);
      expect(previews()).toEqual([
        'data:image/jpeg;base64,abc',
        'data:image/jpeg;base64,xyz',
      ]);
    });

    it('should report stored previews that fail to load', async () => {
      const error: LccError = { name: 'LCCError', message: 'Could not read images.' };
      getAllImagesSpy.mockResolvedValue(error);

      render(null, [], newImagesOf(0), true);
      await getAllImagesSpy.mock.results[0].value;

      expect(fileActionFailSpy).toHaveBeenCalledWith(error);
    });

    it('should start a fresh form without any errors showing', async () => {
      render();

      await settle();

      expect(component.form.invalid).toBe(true);
      expect(component.form.touched).toBe(false);
      expect(errorTexts()).toEqual([]);
    });

    it('should show the errors of a restored draft straight away', async () => {
      const [first, second] = entitiesOf(0, 3);

      render(
        album,
        [first, { ...second, formData: { ...second.formData, caption: '' } }],
        {},
        true,
      );
      await settle();

      expect(component.form.controls.existingImages.at(1).controls.caption.touched).toBe(
        true,
      );
      expect(errorTexts()).toHaveLength(1);
    });

    it('should pass the draft of every image to the store as soon as the form opens', () => {
      render(album, entitiesOf(0, 3));

      expect(changeSpy).toHaveBeenCalledTimes(1);
      expect(lastDraft()).toEqual(entitiesOf(0, 3).map(({ formData }) => formData));
    });
  });

  describe('keeping the draft', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      render(album, entitiesOf(0, 3));
      changeSpy.mockClear();
    });

    afterEach(() => vi.useRealTimers());

    it('should pass changes on once typing pauses, renaming every image with the album', () => {
      component.form.controls.album.setValue('John');
      component.form.controls.album.setValue("John's best");
      vi.advanceTimersByTime(FORM_CHANGE_DEBOUNCE - 1);
      const beforePause = changeSpy.mock.calls.length;

      vi.advanceTimersByTime(1);

      expect(beforePause).toBe(0);
      expect(changeSpy).toHaveBeenCalledTimes(1);
      expect(lastDraft().map(image => image.album)).toEqual([
        "John's best",
        "John's best",
      ]);
    });

    it('should pass the draft on at once when the form is submitted', async () => {
      dialogOpenSpy.mockReturnValue(closedDialogRef('cancel'));
      component.form.controls.existingImages.at(0).controls.caption.setValue('Round one');

      await component.onSubmit();

      expect(lastDraft()[0]).toEqual(expect.objectContaining({ caption: 'Round one' }));
    });

    it('should pass the draft on at once when focus leaves a field', () => {
      component.form.controls.album.setValue('John');

      query(fixture.debugElement, 'form').triggerEventHandler('focusout');

      expect(lastDraft().map(image => image.album)).toEqual(['John', 'John']);
    });
  });

  describe('validation', () => {
    it('should require an album title and a caption and position for each image', () => {
      render(album, entitiesOf(0));

      component.form.controls.album.setValue('');
      component.form.controls.existingImages.at(0).patchValue({
        caption: '',
        albumOrdinality: '',
      });

      const image = component.form.controls.existingImages.at(0).controls;
      expect(component.form.controls.album.hasError('required')).toBe(true);
      expect(image.caption.hasError('required')).toBe(true);
      expect(image.albumOrdinality.hasError('required')).toBe(true);
    });

    it('should accept a position from 1 to 99 only', () => {
      render(album, entitiesOf(0));
      const position =
        component.form.controls.existingImages.at(0).controls.albumOrdinality;

      position.setValue('99');
      const highest = position.valid;
      position.setValue('0');

      expect(highest).toBe(true);
      expect(position.hasError('invalidOrdinal')).toBe(true);
    });

    it('should need at least one image to create a new album', () => {
      render();

      component.form.controls.album.setValue('Blitz night');

      expect(component.form.controls.newImages.hasError('required')).toBe(true);
      expect(component.form.invalid).toBe(true);
    });

    it('should save an existing album without any new images', () => {
      render(album, entitiesOf(0, 3));

      expect(component.form.valid).toBe(true);
    });

    it("should explain the app's own validation errors under the field", async () => {
      render(album, entitiesOf(0));
      const position =
        component.form.controls.existingImages.at(0).controls.albumOrdinality;

      position.setValue('0');
      position.markAsTouched();
      await settle();

      expect(errorTexts()).toEqual([FORM_ERROR_MESSAGES['invalidOrdinal']]);
    });
  });

  describe('choosing files', () => {
    it('should add each picked image, named and placed after the images already there', async () => {
      render(album, entitiesOf(0, 3));

      pickFiles([board('first.board.png'), board('second.board.png')]);
      await storedFiles();

      expect(storeImageFileSpy).toHaveBeenCalledTimes(2);
      expect(component.form.controls.newImages.getRawValue()).toEqual([
        {
          id: 'new-uuid-first.board.png',
          filename: 'first.board.png',
          caption: 'first.board',
          albumOrdinality: '3',
          albumCover: false,
        },
        {
          id: 'new-uuid-second.board.png',
          filename: 'second.board.png',
          caption: 'second.board',
          albumOrdinality: '4',
          albumCover: false,
        },
      ]);
      expect(previews()).toEqual([
        'data:image/png;base64,first.board.png',
        'data:image/png;base64,second.board.png',
      ]);
    });

    it('should make the first image of a new album its cover', async () => {
      render();

      await component.onChooseFiles([board('a.png'), board('b.png')]);

      expect(covers()).toEqual([true, false]);
    });

    it('should add only the newly picked files on each pick', async () => {
      render();

      pickFiles([board('a.png')]);
      await storedFiles();
      pickFiles([board('b.png')]);
      await storedFiles();

      expect(
        component.form.controls.newImages.controls.map(
          image => image.controls.filename.value,
        ),
      ).toEqual(['a.png', 'b.png']);
    });

    it(`should refuse more than ${MAX_NEW_IMAGES} new images at a time`, async () => {
      render(null, [], newImagesOf(...Array.from({ length: 14 }, (_, index) => index)));

      await component.onChooseFiles(
        Array.from({ length: MAX_NEW_IMAGES - 13 }, (_, index) => board(`${index}.png`)),
      );

      expect(storeImageFileSpy).not.toHaveBeenCalled();
      expect(fileActionFailSpy).toHaveBeenCalledWith({
        name: 'LCCError',
        message: `Only up to ${MAX_NEW_IMAGES} images can be uploaded at a time.`,
      });
      expect(component.form.controls.newImages.length).toBe(14);
    });

    it('should report a file that could not be stored and keep the others', async () => {
      const error: LccError = { name: 'LCCError', message: 'The file is too large.' };
      storeImageFileSpy.mockResolvedValueOnce(error);
      render();

      await component.onChooseFiles([board('huge.png'), board('small.png')]);

      expect(fileActionFailSpy).toHaveBeenCalledWith(error);
      expect(
        component.form.controls.newImages.controls.map(
          image => image.controls.filename.value,
        ),
      ).toEqual(['small.png']);
    });

    it('should turn away a file that is not an image', () => {
      render();

      pickFiles([new File(['%PDF'], 'minutes.pdf', { type: 'application/pdf' })]);

      expect(storeImageFileSpy).not.toHaveBeenCalled();
      expect(fileActionFailSpy).toHaveBeenCalledWith({
        name: 'LCCError',
        message: 'Only image files can be added.',
      });
    });
  });

  describe('album cover', () => {
    afterEach(() => vi.useRealTimers());

    it('should make the chosen image the only cover', () => {
      render(album, entitiesOf(0, 3));

      clickCover(1);

      expect(covers()).toEqual([false, true]);
    });

    it('should move the cover between existing and new images', async () => {
      render(album, entitiesOf(0, 3));
      await component.onChooseFiles([board('a.png')]);
      fixture.detectChanges();

      clickCover(2);

      expect(covers()).toEqual([false, false, true]);
    });

    it('should pass the cover on as a single change', () => {
      vi.useFakeTimers();
      render(album, entitiesOf(0, 3));
      changeSpy.mockClear();

      clickCover(1);
      vi.advanceTimersByTime(FORM_CHANGE_DEBOUNCE);

      expect(changeSpy).toHaveBeenCalledTimes(1);
      expect(lastDraft().map(image => image.albumCover)).toEqual([false, true]);
    });
  });

  describe('removing a new image', () => {
    it('should ask before removing a new image', () => {
      render(null, [], newImagesOf(1, 0, 3), true);
      dialogOpenSpy.mockReturnValue(closedDialogRef('cancel'));

      queryAll(fixture.debugElement, '.remove-image-button')[1].triggerEventHandler(
        'clicked',
      );

      expect(lastOpenedDialog(dialogOpenSpy)).toEqual({
        title: 'Confirm',
        body: `Remove ${MOCK_IMAGES[0].filename}?`,
        confirmButtonText: 'Remove',
        confirmButtonType: 'warning',
      });
    });

    it('should delete the stored file and hand the cover to the first new image left', async () => {
      render(null, [], newImagesOf(1, 0, 3), true);
      await getAllImagesSpy.mock.results[0].value;
      dialogOpenSpy.mockReturnValue(closedDialogRef('confirm'));
      const coversBefore = covers();

      await component.onRemoveNewImage(
        component.form.controls.newImages.at(1).getRawValue(),
        1,
      );

      expect(coversBefore).toEqual([false, true, false]);
      expect(deleteImageSpy).toHaveBeenCalledWith('new-0');
      expect(removeNewImageSpy).toHaveBeenCalledWith('new-0');
      expect(component.newImageDataUrls()).not.toHaveProperty('new-0');
      expect(covers()).toEqual([true, false]);
    });

    it('should hand the cover back to an existing image when no new image is left', async () => {
      render(album, entitiesOf(0, 3));
      await component.onChooseFiles([board('cover.png')]);
      component.onSetAlbumCover('new-uuid-cover.png');
      dialogOpenSpy.mockReturnValue(closedDialogRef('confirm'));

      await component.onRemoveNewImage(
        component.form.controls.newImages.at(0).getRawValue(),
        0,
      );

      expect(covers()).toEqual([true, false]);
    });

    it('should keep an image whose stored file could not be deleted', async () => {
      const error: LccError = {
        name: 'LCCError',
        message: 'Could not delete the image.',
      };
      deleteImageSpy.mockResolvedValue(error);
      dialogOpenSpy.mockReturnValue(closedDialogRef('confirm'));
      render(null, [], newImagesOf(0), true);

      await component.onRemoveNewImage(
        component.form.controls.newImages.at(0).getRawValue(),
        0,
      );

      expect(fileActionFailSpy).toHaveBeenCalledWith(error);
      expect(component.form.controls.newImages.length).toBe(1);
    });

    it('should keep the image when cancelled', async () => {
      dialogOpenSpy.mockReturnValue(closedDialogRef('cancel'));
      render(null, [], newImagesOf(0), true);

      await component.onRemoveNewImage(
        component.form.controls.newImages.at(0).getRawValue(),
        0,
      );

      expect(deleteImageSpy).not.toHaveBeenCalled();
      expect(component.form.controls.newImages.length).toBe(1);
    });
  });

  describe('restoring', () => {
    it('should put the original images back and drop the new ones once confirmed', async () => {
      const [first, second] = entitiesOf(0, 3);
      render(
        album,
        [first, { ...second, formData: { ...second.formData, caption: 'Changed' } }],
        newImagesOf(5),
        true,
      );
      await getAllImagesSpy.mock.results[0].value;
      dialogOpenSpy.mockReturnValue(closedDialogRef('confirm'));

      await component.onRestore();
      fixture.detectChanges();

      expect(lastOpenedDialog(dialogOpenSpy)).toEqual({
        title: 'Confirm',
        body: 'Revert to the original album data? All changes will be lost.',
        confirmButtonText: 'Revert',
        confirmButtonType: 'warning',
      });
      expect(restoreSpy).toHaveBeenCalledWith(album);
      expect(component.form.controls.existingImages.at(1).controls.caption.value).toBe(
        MOCK_IMAGES[3].caption,
      );
      expect(component.form.controls.newImages.length).toBe(0);
      expect(component.newImageDataUrls()).toEqual({});
      expect(previews()).toEqual([]);
      expect(component.form.touched).toBe(false);
    });

    it('should empty a new album', async () => {
      render(null, [], newImagesOf(0), true);
      dialogOpenSpy.mockReturnValue(closedDialogRef('confirm'));

      await component.onRestore();

      expect(restoreSpy).toHaveBeenCalledWith(null);
      expect(component.form.getRawValue()).toEqual({
        album: '',
        existingImages: [],
        newImages: [],
      });
    });

    it('should change nothing when cancelled', async () => {
      render(album, entitiesOf(0, 3), {}, true);
      component.form.controls.existingImages.at(0).controls.caption.setValue('Changed');
      dialogOpenSpy.mockReturnValue(closedDialogRef('cancel'));

      await component.onRestore();

      expect(restoreSpy).not.toHaveBeenCalled();
      expect(component.form.controls.existingImages.at(0).controls.caption.value).toBe(
        'Changed',
      );
    });
  });

  describe('submitting', () => {
    it('should not create an album without images', async () => {
      render();
      component.form.controls.album.setValue('Blitz night');
      await settle();

      query(fixture.debugElement, 'form').triggerEventHandler('ngSubmit');
      await settle();

      expect(component.form.controls.newImages.hasError('required')).toBe(true);
      expect(dialogOpenSpy).not.toHaveBeenCalled();
    });

    it('should create a new album from the confirmation dialog', async () => {
      render(null, [], newImagesOf(3), true);

      await component.onSubmit();
      await lastOpenedDialog(dialogOpenSpy).confirmAction?.();

      expect(dialogOpenSpy).toHaveBeenCalledWith(BasicDialogComponent, expect.anything());
      expect(lastOpenedDialog(dialogOpenSpy)).toEqual(
        expect.objectContaining({
          body: 'Create new album with this 1 new image?',
          confirmButtonText: 'Create',
        }),
      );
      expect(storeRequestSpy).toHaveBeenCalledWith(ImagesActions.addImagesRequested(), [
        ImagesActions.addImagesSucceeded,
        ImagesActions.addImagesFailed,
      ]);
    });

    it('should update an existing album from the confirmation dialog', async () => {
      render(album, entitiesOf(0, 3), {}, true);

      await component.onSubmit();
      await lastOpenedDialog(dialogOpenSpy).confirmAction?.();

      expect(lastOpenedDialog(dialogOpenSpy)).toEqual(
        expect.objectContaining({
          body: `Update ${album}?`,
          confirmButtonText: 'Update',
        }),
      );
      expect(storeRequestSpy).toHaveBeenCalledWith(
        ImagesActions.updateAlbumRequested({ album }),
        [ImagesActions.updateAlbumSucceeded, ImagesActions.updateAlbumFailed],
      );
    });

    it('should ask to upload the new images along with the album update', async () => {
      render(album, entitiesOf(0, 3), {}, true);
      await component.onChooseFiles([board('a.png'), board('b.png')]);

      await component.onSubmit();

      expect(lastOpenedDialog(dialogOpenSpy).body).toBe(
        `Update ${album} and upload these 2 new images?`,
      );
    });

    it('should show the progress of the upload in the confirmation dialog', async () => {
      render(null, [], newImagesOf(3), true);
      TestBed.inject(MockStore).setState({
        imagesState: { ...imagesInitialState, uploadProgress: { uploaded: 1, total: 2 } },
        membersState: membersInitialState,
      });

      await component.onSubmit();

      expect(lastOpenedDialog(dialogOpenSpy).uploadProgress?.()).toEqual({
        uploaded: 1,
        total: 2,
      });
    });

    it('should save nothing until the dialog is confirmed', async () => {
      render(null, [], newImagesOf(3), true);
      dialogOpenSpy.mockReturnValue(closedDialogRef('cancel'));

      await component.onSubmit();

      expect(dialogOpenSpy).toHaveBeenCalledTimes(1);
      expect(storeRequestSpy).not.toHaveBeenCalled();
    });
  });

  describe('template', () => {
    it('should set new images apart from those an album already has', () => {
      render();
      const forNew = query(fixture.debugElement, '.new-images-header');
      fixture.destroy();

      render(album, entitiesOf(0, 3));

      expect(forNew).toBeFalsy();
      expect(queryTextContent(fixture.debugElement, '.new-images-header')).toBe(
        'New images',
      );
    });

    it('should offer to choose files for a new album and add more to an existing one', () => {
      render();
      const forNew = uploader().ariaLabel();
      fixture.destroy();

      render(album, entitiesOf(0, 3));

      expect(forNew).toBe('Choose files');
      expect(uploader().ariaLabel()).toBe('Add more files');
    });

    it('should credit the most recent edit to the album', () => {
      render(
        album,
        MOCK_IMAGES.map(image => ({
          image,
          formData: pick(image, IMAGE_FORM_DATA_PROPERTIES),
        })),
      );

      expect(component.mostRecentModificationInfo).toBe(MOCK_IMAGES[13].modificationInfo);
      expect(query(fixture.debugElement, 'lcc-modification-info')).toBeTruthy();
    });

    it('should show no edits for a new album', () => {
      render();

      expect(component.mostRecentModificationInfo).toBeNull();
      expect(query(fixture.debugElement, 'lcc-modification-info')).toBeFalsy();
    });

    it('should only offer to discard or save once something has changed', () => {
      render(album, entitiesOf(0, 3), {}, false);
      const restoreWithout = button('.restore-button').disabled();
      const submitWithout = button('.submit-button').disabled();
      fixture.destroy();

      render(album, entitiesOf(0, 3), {}, true);

      expect(restoreWithout).toBe(true);
      expect(submitWithout).toBe(true);
      expect(button('.restore-button').disabled()).toBe(false);
      expect(button('.submit-button').disabled()).toBe(false);
    });

    it('should disable the save button while the form is invalid', () => {
      render(null, [], {}, true);

      expect(component.form.invalid).toBe(true);
      expect(button('.submit-button').disabled()).toBe(true);
    });

    it('should cancel from the cancel button', () => {
      render();

      query(fixture.debugElement, '.cancel-button').triggerEventHandler('clicked');

      expect(cancelSpy).toHaveBeenCalledTimes(1);
    });

    it('should label the save button for creating or updating', () => {
      render(null, [], newImagesOf(3), true);
      const creating = queryTextContent(fixture.debugElement, '.submit-button');
      fixture.destroy();

      render(album, entitiesOf(0, 3), {}, true);

      expect(creating).toBe('Create album');
      expect(queryTextContent(fixture.debugElement, '.submit-button')).toBe(
        'Update album',
      );
    });
  });
});
