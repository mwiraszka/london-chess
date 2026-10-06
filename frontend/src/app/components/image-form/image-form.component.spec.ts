import { ButtonComponent, DialogService } from '@eagami/ui';
import { provideMockStore } from '@ngrx/store/testing';
import { pick, uniq } from 'lodash';

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BasicDialogComponent } from '@app/components/basic-dialog/basic-dialog.component';
import { IMAGE_FORM_DATA_PROPERTIES, INITIAL_IMAGE_FORM_DATA } from '@app/constants';
import { FORM_CHANGE_DEBOUNCE, FORM_ERROR_MESSAGES } from '@app/constants/forms';
import { IMAGE_FALLBACK_SRC } from '@app/constants/images';
import { MOCK_IMAGES } from '@app/mocks/images.mock';
import { Image, ImageFormData, LccError } from '@app/models';
import { ImageFileService, StoreRequestService } from '@app/services';
import { ImagesActions } from '@app/store/images';
import { initialState as membersInitialState } from '@app/store/members/members.reducer';
import { GENERATE_UUID } from '@app/tokens';
import {
  closedDialogRef,
  lastOpenedDialog,
  query,
  queryAll,
  queryTextContent,
} from '@app/utils';

import { ImageFormComponent } from './image-form.component';

describe('ImageFormComponent', () => {
  let fixture: ComponentFixture<ImageFormComponent>;
  let component: ImageFormComponent;

  let cancelSpy: MockInstance;
  let changeSpy: MockInstance;
  let dialogOpenSpy: Mock;
  let fileActionFailSpy: MockInstance;
  let getImageSpy: Mock;
  let requestFetchMainImageSpy: MockInstance;
  let restoreSpy: MockInstance;
  let storeImageFileSpy: Mock;
  let storeRequestSpy: Mock;

  const existingAlbums = uniq(MOCK_IMAGES.map(image => image.album));
  const newImageData: ImageFormData = {
    id: 'new-5678',
    filename: 'blitz-night.png',
    caption: 'Clocks ticking',
    album: 'Blitz night',
    albumCover: false,
    albumOrdinality: '1',
  };
  const entity: { image: Image; formData: ImageFormData } = {
    image: MOCK_IMAGES[0],
    formData: pick(MOCK_IMAGES[0], IMAGE_FORM_DATA_PROPERTIES),
  };
  const boardFile = new File([':)'], 'first.board.png', { type: 'image/png' });

  function render(
    imageEntity: typeof entity | null = null,
    newImageFormData: ImageFormData | null = null,
    hasUnsavedChanges = false,
  ): void {
    fixture = TestBed.createComponent(ImageFormComponent);
    component = fixture.componentInstance;
    cancelSpy = vi.spyOn(component.cancel, 'emit');
    changeSpy = vi.spyOn(component.change, 'emit');
    fileActionFailSpy = vi.spyOn(component.fileActionFail, 'emit');
    requestFetchMainImageSpy = vi.spyOn(component.requestFetchMainImage, 'emit');
    restoreSpy = vi.spyOn(component.restore, 'emit');

    fixture.componentRef.setInput('existingAlbums', existingAlbums);
    fixture.componentRef.setInput('hasUnsavedChanges', hasUnsavedChanges);
    fixture.componentRef.setInput('imageEntity', imageEntity);
    fixture.componentRef.setInput('newImageFormData', newImageFormData);
    fixture.detectChanges();
  }

  async function settle(): Promise<void> {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  const lastDraft = (): Partial<ImageFormData> =>
    changeSpy.mock.lastCall?.[0].multipleFormData[0];

  const button = (selector: string): ButtonComponent =>
    query(fixture.debugElement, selector).componentInstance;

  const errorTexts = (): string[] =>
    Array.from<HTMLElement>(fixture.nativeElement.querySelectorAll('[role="alert"]')).map(
      element => element.textContent?.trim() ?? '',
    );

  const previewSrc = (): string | null =>
    query(fixture.debugElement, '.image-container img').nativeElement.getAttribute('src');

  // Picks a file the way the browser hands it to the uploader's hidden file input
  const pickFile = (file: File): void => {
    const fileInput: HTMLInputElement = query(
      fixture.debugElement,
      'ea-file-uploader input[type="file"]',
    ).nativeElement;
    Object.defineProperty(fileInput, 'files', { value: [file], configurable: true });
    fileInput.dispatchEvent(new Event('change'));
  };

  const storedFile = async (): Promise<void> => {
    await storeImageFileSpy.mock.results.at(-1)?.value;
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ImageFormComponent],
      providers: [
        provideMockStore({ initialState: { membersState: membersInitialState } }),
        { provide: GENERATE_UUID, useValue: vi.fn(() => '1234') },
        { provide: DialogService, useValue: { open: vi.fn(() => closedDialogRef()) } },
        {
          provide: ImageFileService,
          useValue: { storeImageFile: vi.fn(), getImage: vi.fn() },
        },
        {
          provide: StoreRequestService,
          useValue: { dispatch: vi.fn().mockResolvedValue(null) },
        },
      ],
    }).compileComponents();

    dialogOpenSpy = vi.mocked(TestBed.inject(DialogService).open);
    getImageSpy = vi.mocked(TestBed.inject(ImageFileService).getImage);
    storeImageFileSpy = vi.mocked(TestBed.inject(ImageFileService).storeImageFile);
    storeRequestSpy = vi.mocked(TestBed.inject(StoreRequestService).dispatch);

    getImageSpy.mockReturnValue({
      id: newImageData.id,
      filename: newImageData.filename,
      dataUrl: 'data:image/png;base64,abc',
    });
    storeImageFileSpy.mockResolvedValue({
      id: 'new-1234',
      filename: 'first.board.png',
      dataUrl: 'data:image/png;base64,xyz',
    });
  });

  describe('initialization', () => {
    it('should start a new image under a new ID with the starting values', () => {
      render();

      expect(component.form.getRawValue()).toEqual({
        ...INITIAL_IMAGE_FORM_DATA,
        id: 'new-1234',
      });
      expect(getImageSpy).not.toHaveBeenCalled();
      expect(requestFetchMainImageSpy).not.toHaveBeenCalled();
    });

    it('should pick up the draft of a new image with its stored preview', () => {
      render(null, newImageData, true);

      expect(component.form.getRawValue()).toEqual(newImageData);
      expect(getImageSpy).toHaveBeenCalledWith(newImageData.id);
      expect(previewSrc()).toBe('data:image/png;base64,abc');
    });

    it('should show no preview for a draft whose file this tab does not hold', () => {
      getImageSpy.mockReturnValue(null);

      render(null, newImageData, true);

      expect(previewSrc()).toBe(IMAGE_FALLBACK_SRC);
    });

    it('should edit an existing image from its draft', () => {
      const draft = { ...entity.formData, caption: 'A new caption' };

      render({ ...entity, formData: draft }, null, true);

      expect(component.form.getRawValue()).toEqual(draft);
      expect(getImageSpy).not.toHaveBeenCalled();
    });

    it('should ask for an existing image that has not been loaded yet', () => {
      render(entity);
      const whenLoaded = requestFetchMainImageSpy.mock.calls.length;
      fixture.destroy();

      render({
        ...entity,
        image: { ...entity.image, mainUrl: undefined, thumbnailUrl: undefined },
      });

      expect(whenLoaded).toBe(0);
      expect(requestFetchMainImageSpy).toHaveBeenCalledWith(entity.image.id);
    });

    it('should start a fresh form without any errors showing', async () => {
      render();

      await settle();

      expect(component.form.invalid).toBe(true);
      expect(component.form.touched).toBe(false);
      expect(errorTexts()).toEqual([]);
    });

    it('should show the errors of a restored draft straight away', async () => {
      render(null, { ...newImageData, filename: '', caption: '' }, true);

      await settle();

      expect(component.form.controls.caption.touched).toBe(true);
      expect(errorTexts()).toContain('Choose an image to upload');
      expect(errorTexts()).toHaveLength(2);
    });

    it('should pass the draft to the store as soon as the form opens', () => {
      render(null, newImageData);

      expect(changeSpy).toHaveBeenCalledTimes(1);
      expect(changeSpy).toHaveBeenCalledWith({ multipleFormData: [newImageData] });
    });
  });

  describe('keeping the draft', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      render(entity);
      changeSpy.mockClear();
    });

    afterEach(() => vi.useRealTimers());

    it('should pass changes on once typing pauses', () => {
      component.form.controls.caption.setValue('Clocks');
      component.form.controls.caption.setValue('Clocks ticking');
      vi.advanceTimersByTime(FORM_CHANGE_DEBOUNCE - 1);
      const beforePause = changeSpy.mock.calls.length;

      vi.advanceTimersByTime(1);

      expect(beforePause).toBe(0);
      expect(changeSpy).toHaveBeenCalledTimes(1);
      expect(lastDraft()).toEqual({ ...entity.formData, caption: 'Clocks ticking' });
    });

    it('should pass the draft on at once when the form is submitted', async () => {
      dialogOpenSpy.mockReturnValue(closedDialogRef('cancel'));
      component.form.controls.album.setValue('Tournaments');

      await component.onSubmit();

      expect(lastDraft()).toEqual(expect.objectContaining({ album: 'Tournaments' }));
    });

    it('should pass the draft on at once when focus leaves a field', () => {
      component.form.controls.caption.setValue('Clocks ticking');

      query(fixture.debugElement, 'form').triggerEventHandler('focusout');

      expect(lastDraft()).toEqual(expect.objectContaining({ caption: 'Clocks ticking' }));
    });
  });

  describe('validation', () => {
    beforeEach(() => render(null, newImageData));

    it('should require a file, a caption and an album', () => {
      component.form.patchValue({ filename: '', caption: '', album: '' });

      expect(component.form.controls.filename.hasError('required')).toBe(true);
      expect(component.form.controls.caption.hasError('required')).toBe(true);
      expect(component.form.controls.album.hasError('required')).toBe(true);
    });

    it('should accept any text a person might type, emoji included', () => {
      component.form.patchValue({ caption: 'Żubrówka 🔥', album: "John's Images" });

      expect(component.form.valid).toBe(true);
    });

    it('should keep an album name to 120 characters', () => {
      component.form.controls.album.setValue('a'.repeat(121));

      expect(component.form.controls.album.hasError('maxlength')).toBe(true);
    });

    it("should explain the app's own validation errors under the field", async () => {
      component.form.controls.caption.setValue('Bell \u0007');
      component.form.controls.caption.markAsTouched();

      await settle();

      expect(errorTexts()).toEqual([FORM_ERROR_MESSAGES['invalidText']]);
    });
  });

  describe('choosing a file', () => {
    beforeEach(() => render());

    it('should store the picked file and name the image after it', async () => {
      pickFile(boardFile);
      await storedFile();

      expect(storeImageFileSpy).toHaveBeenCalledWith('new-1234', boardFile);
      expect(component.form.controls.filename.value).toBe('first.board.png');
      expect(component.form.controls.caption.value).toBe('first.board');
      expect(previewSrc()).toBe('data:image/png;base64,xyz');
    });

    it('should keep a caption that was already typed', async () => {
      component.form.controls.caption.setValue('Opening night');

      pickFile(boardFile);
      await storedFile();

      expect(component.form.controls.caption.value).toBe('Opening night');
    });

    it('should report a file that could not be stored', async () => {
      const error: LccError = { name: 'LCCError', message: 'The file is too large.' };
      storeImageFileSpy.mockResolvedValue(error);

      pickFile(boardFile);
      await storedFile();

      expect(fileActionFailSpy).toHaveBeenCalledWith(error);
      expect(component.form.controls.filename.value).toBe('');
      expect(previewSrc()).toBe(IMAGE_FALLBACK_SRC);
    });

    it('should turn away a file that is not an image', () => {
      pickFile(new File(['%PDF'], 'minutes.pdf', { type: 'application/pdf' }));

      expect(storeImageFileSpy).not.toHaveBeenCalled();
      expect(fileActionFailSpy).toHaveBeenCalledWith({
        name: 'LCCError',
        message: 'Only image files can be added.',
      });
    });

    it('should clear the missing file error once a file is picked', async () => {
      component.form.patchValue({ caption: 'Opening night', album: 'Ceremonies' });
      query(fixture.debugElement, 'form').triggerEventHandler('ngSubmit');
      await settle();
      const errorsBefore = errorTexts();

      pickFile(boardFile);
      await storedFile();
      await settle();

      expect(errorsBefore).toEqual(['Choose an image to upload']);
      expect(errorTexts()).toEqual([]);
    });
  });

  describe('restoring', () => {
    it('should put the original image back', () => {
      render(
        { ...entity, formData: { ...entity.formData, caption: 'Changed' } },
        null,
        true,
      );

      query(fixture.debugElement, 'lcc-form-actions').triggerEventHandler('restore');

      expect(restoreSpy).toHaveBeenCalledWith(entity.image.id);
      expect(component.form.getRawValue()).toEqual(entity.formData);
      expect(component.form.touched).toBe(false);
    });

    it('should empty a new image back to its starting values and drop its preview', async () => {
      render(null, newImageData, true);

      query(fixture.debugElement, 'lcc-form-actions').triggerEventHandler('restore');
      fixture.detectChanges();

      expect(restoreSpy).toHaveBeenCalledWith(newImageData.id);
      expect(component.form.getRawValue()).toEqual({
        ...INITIAL_IMAGE_FORM_DATA,
        id: newImageData.id,
      });
      expect(previewSrc()).toBe(IMAGE_FALLBACK_SRC);
    });
  });

  describe('submitting', () => {
    it('should show every error instead of asking to save an invalid form', async () => {
      render();
      await settle();
      const errorsBefore = errorTexts();

      query(fixture.debugElement, 'form').triggerEventHandler('ngSubmit');
      await settle();

      expect(errorsBefore).toEqual([]);
      expect(component.form.controls.caption.touched).toBe(true);
      expect(errorTexts()).toHaveLength(3);
      expect(errorTexts()).toContain('Choose an image to upload');
      expect(dialogOpenSpy).not.toHaveBeenCalled();
    });

    it('should add a new image from the confirmation dialog', async () => {
      render(null, newImageData, true);

      await component.onSubmit();
      await lastOpenedDialog(dialogOpenSpy).confirmAction?.();

      expect(dialogOpenSpy).toHaveBeenCalledWith(BasicDialogComponent, expect.anything());
      expect(lastOpenedDialog(dialogOpenSpy)).toEqual(
        expect.objectContaining({
          body: `Add ${newImageData.filename} to ${newImageData.album}?`,
          confirmButtonText: 'Add',
        }),
      );
      expect(storeRequestSpy).toHaveBeenCalledWith(
        ImagesActions.addImageRequested({ imageId: newImageData.id }),
        [ImagesActions.addImageSucceeded, ImagesActions.addImageFailed],
      );
    });

    it('should update an existing image from the confirmation dialog', async () => {
      render(entity, null, true);

      await component.onSubmit();
      await lastOpenedDialog(dialogOpenSpy).confirmAction?.();

      expect(lastOpenedDialog(dialogOpenSpy)).toEqual(
        expect.objectContaining({
          body: `Update ${entity.image.filename}?`,
          confirmButtonText: 'Update',
        }),
      );
      expect(storeRequestSpy).toHaveBeenCalledWith(
        ImagesActions.updateImageRequested({ imageId: entity.image.id }),
        [ImagesActions.updateImageSucceeded, ImagesActions.updateImageFailed],
      );
    });

    it('should save nothing until the dialog is confirmed', async () => {
      render(null, newImageData, true);
      dialogOpenSpy.mockReturnValue(closedDialogRef('cancel'));

      await component.onSubmit();

      expect(dialogOpenSpy).toHaveBeenCalledTimes(1);
      expect(storeRequestSpy).not.toHaveBeenCalled();
    });
  });

  describe('template', () => {
    it('should offer the existing albums to choose from', () => {
      render();

      const albumLabels = queryAll(fixture.debugElement, '.albums-grid > ea-radio').map(
        radio => radio.componentInstance.label(),
      );

      expect(albumLabels).toEqual(existingAlbums);
    });

    it('should take a new album name typed into the album field', () => {
      render();
      const albumInput: HTMLInputElement = query(
        fixture.debugElement,
        '.new-album-input input',
      ).nativeElement;

      albumInput.value = 'Blitz night';
      albumInput.dispatchEvent(new Event('input'));

      expect(component.form.controls.album.value).toBe('Blitz night');
    });

    it('should only offer a file picker for a new image', () => {
      render();
      const forNew = query(fixture.debugElement, 'ea-file-uploader');
      fixture.destroy();

      render(entity);

      expect(forNew).toBeTruthy();
      expect(query(fixture.debugElement, 'ea-file-uploader')).toBeFalsy();
      expect(query(fixture.debugElement, '.image-container lcc-image')).toBeTruthy();
    });

    it('should show who created and edited an existing image only', () => {
      render(entity);
      const forExisting = query(fixture.debugElement, 'lcc-modification-info');
      fixture.destroy();

      render();

      expect(forExisting).toBeTruthy();
      expect(query(fixture.debugElement, 'lcc-modification-info')).toBeFalsy();
    });

    it('should only offer to discard or save once something has changed', () => {
      render(entity, null, false);
      const restoreWithout = button('.restore-button').disabled();
      const submitWithout = button('.submit-button').disabled();
      fixture.destroy();

      render(entity, null, true);

      expect(restoreWithout).toBe(true);
      expect(submitWithout).toBe(true);
      expect(button('.restore-button').disabled()).toBe(false);
      expect(button('.submit-button').disabled()).toBe(false);
    });

    it('should disable the save button while the form is invalid', () => {
      render(null, { ...newImageData, caption: '' }, true);

      expect(button('.submit-button').disabled()).toBe(true);
    });

    it('should cancel from the cancel button', () => {
      render();

      query(fixture.debugElement, '.cancel-button').triggerEventHandler('clicked');

      expect(cancelSpy).toHaveBeenCalledTimes(1);
    });

    it('should label the save button for adding or updating', () => {
      render(null, newImageData, true);
      const adding = queryTextContent(fixture.debugElement, '.submit-button');
      fixture.destroy();

      render(entity, null, true);

      expect(adding).toBe('Add image');
      expect(queryTextContent(fixture.debugElement, '.submit-button')).toBe(
        'Update image',
      );
    });
  });
});
