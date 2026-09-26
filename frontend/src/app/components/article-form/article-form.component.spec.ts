import { provideMockStore } from '@ngrx/store/testing';
import { pick } from 'lodash';

import { Component, input } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';

import { BasicDialogComponent } from '@app/components/basic-dialog/basic-dialog.component';
import { ImageExplorerComponent } from '@app/components/image-explorer/image-explorer.component';
import { MarkdownRendererComponent } from '@app/components/markdown-renderer/markdown-renderer.component';
import { ARTICLE_FORM_DATA_PROPERTIES } from '@app/constants';
import { MOCK_ARTICLES } from '@app/mocks/articles.mock';
import { MOCK_IMAGES } from '@app/mocks/images.mock';
import { Image } from '@app/models';
import { DialogService, StoreRequestService } from '@app/services';
import { ArticlesActions } from '@app/store/articles';
import { initialState as membersInitialState } from '@app/store/members/members.reducer';
import { lastOpenedDialog, query } from '@app/utils';

import { ArticleFormComponent } from './article-form.component';

@Component({
  selector: 'lcc-markdown-renderer',
  template: '',
  standalone: true,
})
class MockMarkdownRendererComponent {
  readonly data = input<string>();
  readonly images = input<Image[]>([]);
  readonly isWideView = input(false);
}

describe('ArticleFormComponent', () => {
  let fixture: ComponentFixture<ArticleFormComponent>;
  let component: ArticleFormComponent;

  let dialogService: DialogService;

  let cancelSpy: MockInstance;
  let changeSpy: MockInstance;
  let dialogOpenSpy: MockInstance;
  let initFormSpy: MockInstance;
  let initFormValueChangeListenerSpy: MockInstance;
  let insertImageSpy: MockInstance;
  let requestFetchMainImageSpy: MockInstance;
  let storeRequestSpy: Mock;
  let restoreSpy: MockInstance;
  let revertBannerImageSpy: MockInstance;
  let selectBannerImageSpy: MockInstance;
  let submitSpy: MockInstance;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ArticleFormComponent, ReactiveFormsModule],
      providers: [
        provideMockStore({ initialState: { membersState: membersInitialState } }),
        {
          provide: DialogService,
          useValue: { open: vi.fn() },
        },
        {
          provide: StoreRequestService,
          useValue: { dispatch: vi.fn().mockResolvedValue(null) },
        },
        FormBuilder,
      ],
    })
      .overrideComponent(ArticleFormComponent, {
        remove: { imports: [MarkdownRendererComponent] },
        add: { imports: [MockMarkdownRendererComponent] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(ArticleFormComponent);
    component = fixture.componentInstance;

    dialogService = TestBed.inject(DialogService);

    cancelSpy = vi.spyOn(component.cancel, 'emit');
    changeSpy = vi.spyOn(component.change, 'emit');
    dialogOpenSpy = vi.spyOn(dialogService, 'open');
    // @ts-expect-error Private class member
    initFormSpy = vi.spyOn(component, 'initForm');
    initFormValueChangeListenerSpy = vi.spyOn(
      component,
      // @ts-expect-error Private class member
      'initFormValueChangeListener',
    );
    insertImageSpy = vi.spyOn(component, 'onInsertImage');
    requestFetchMainImageSpy = vi.spyOn(component.requestFetchMainImage, 'emit');
    storeRequestSpy = vi.mocked(TestBed.inject(StoreRequestService).dispatch);
    restoreSpy = vi.spyOn(component.restore, 'emit');
    revertBannerImageSpy = vi.spyOn(component, 'onRevertBannerImage');
    selectBannerImageSpy = vi.spyOn(component, 'onSelectBannerImage');
    submitSpy = vi.spyOn(component, 'onSubmit');

    fixture.componentRef.setInput('bannerImage', null);
    fixture.componentRef.setInput('bodyImages', []);
    fixture.componentRef.setInput(
      'formData',
      pick(MOCK_ARTICLES[0], ARTICLE_FORM_DATA_PROPERTIES),
    );
    fixture.componentRef.setInput('hasUnsavedChanges', false);
    fixture.componentRef.setInput('originalArticle', null);

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('form initialization', () => {
    describe('handling form data', () => {
      it('should initialize with provided formData', () => {
        for (const p of ARTICLE_FORM_DATA_PROPERTIES) {
          expect(component.form.controls[p].value).toBe(component.formData()[p]);
        }
      });
    });

    describe('fetching banner image', () => {
      it('should not emit request fetch main image event if bannerImage is defined', () => {
        fixture.componentRef.setInput('bannerImage', MOCK_IMAGES[0]);
        requestFetchMainImageSpy.mockClear();
        component.ngOnInit();

        expect(requestFetchMainImageSpy).not.toHaveBeenCalled();
      });

      it('should emit request fetch main image event if bannerImage is null', () => {
        fixture.componentRef.setInput('bannerImage', null);
        requestFetchMainImageSpy.mockClear();
        component.ngOnInit();

        expect(requestFetchMainImageSpy).toHaveBeenCalledWith(
          component.formData().bannerImageId,
        );
      });
    });
  });

  describe('form validation', () => {
    describe('required validator', () => {
      it('should mark empty field as invalid', () => {
        component.form.patchValue({ title: '' });
        fixture.detectChanges();

        expect(component.form.controls.title.hasError('required')).toBe(true);
      });

      it('should mark non-empty field as valid', () => {
        component.form.patchValue({ bannerImageId: 'id-1234' });
        fixture.detectChanges();

        expect(component.form.controls.bannerImageId.hasError('required')).toBe(false);
      });
    });

    describe('text validator', () => {
      it('should mark field with whitespace-only text as valid', () => {
        component.form.patchValue({
          bannerImageId: ' ',
          body: '  ',
        });
        fixture.detectChanges();

        expect(component.form.controls.bannerImageId.hasError('invalidText')).toBe(false);
        expect(component.form.controls.body.hasError('invalidText')).toBe(false);
      });

      it('should mark field with emoji as valid', () => {
        component.form.patchValue({
          bannerImageId: '🔥',
          title: 'abc',
          body: '123',
        });
        fixture.detectChanges();

        expect(component.form.controls.bannerImageId.hasError('invalidText')).toBe(false);
        expect(component.form.controls.title.hasError('invalidText')).toBe(false);
        expect(component.form.controls.body.hasError('invalidText')).toBe(false);
      });
    });
  });

  describe('onRestore', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('hasUnsavedChanges', true);
      fixture.componentRef.setInput('originalArticle', MOCK_ARTICLES[4]);
      component.ngOnInit();

      vi.clearAllMocks();
      vi.useFakeTimers();
    });

    afterEach(() => vi.useRealTimers());

    it('should emit both change and restore events and re-initialize form if dialog is confirmed', async () => {
      dialogOpenSpy.mockResolvedValue('confirm');
      fixture.componentRef.setInput(
        'formData',
        pick(MOCK_ARTICLES[4], ARTICLE_FORM_DATA_PROPERTIES),
      );

      await component.onRestore();

      vi.runAllTimers();

      expect(dialogOpenSpy).toHaveBeenCalledWith({
        componentType: BasicDialogComponent,
        isModal: false,
        inputs: {
          dialog: {
            title: 'Confirm',
            body: 'Restore original article data? All changes will be lost.',
            confirmButtonText: 'Restore',
            confirmButtonType: 'warning',
          },
        },
      });

      expect(changeSpy).toHaveBeenCalledTimes(1);
      expect(restoreSpy).toHaveBeenCalledWith(MOCK_ARTICLES[4].id);
      expect(initFormSpy).toHaveBeenCalledTimes(1);
      expect(initFormValueChangeListenerSpy).toHaveBeenCalledTimes(1);

      for (const key of ARTICLE_FORM_DATA_PROPERTIES) {
        expect(component.form.controls[key].value).toBe(
          // @ts-expect-error index signature
          component.originalArticle()[key],
        );
      }
    });

    it('should not emit change or restore event or re-initialize form if dialog is cancelled', async () => {
      dialogOpenSpy.mockResolvedValue('cancel');

      await component.onRestore();

      vi.runAllTimers();

      expect(dialogOpenSpy).toHaveBeenCalledTimes(1);
      expect(changeSpy).not.toHaveBeenCalled();
      expect(restoreSpy).not.toHaveBeenCalled();
      expect(initFormSpy).not.toHaveBeenCalled();
      expect(initFormValueChangeListenerSpy).not.toHaveBeenCalled();
    });
  });

  describe('onSelectBannerImage', () => {
    it('should set selected image as the new banner image', async () => {
      const newImageId = 'new_image_id';
      dialogOpenSpy.mockResolvedValue(`${newImageId}-thumb`);
      component.form.patchValue({ bannerImageId: 'old-image-id' });
      vi.clearAllMocks();

      await component.onSelectBannerImage();

      expect(dialogOpenSpy).toHaveBeenCalledWith({
        componentType: ImageExplorerComponent,
        isModal: true,
      });
      expect(component.form.controls.bannerImageId.value).toBe(newImageId);
      expect(requestFetchMainImageSpy).toHaveBeenCalledWith(newImageId);
    });

    it('should keep current banner image if dialog is closed', async () => {
      dialogOpenSpy.mockResolvedValue('close');
      component.form.patchValue({ bannerImageId: 'old-image-id' });
      vi.clearAllMocks();

      await component.onSelectBannerImage();

      expect(dialogOpenSpy).toHaveBeenCalledWith({
        componentType: ImageExplorerComponent,
        isModal: true,
      });
      expect(component.form.controls.bannerImageId.value).toBe('old-image-id');
      expect(requestFetchMainImageSpy).not.toHaveBeenCalled();
    });
  });

  describe('onRevertBannerImage', () => {
    it('should patch value originalArticle bannerImageId if originalArticle is defined', () => {
      fixture.componentRef.setInput('originalArticle', MOCK_ARTICLES[3]);
      fixture.componentRef.setInput(
        'formData',
        pick(MOCK_ARTICLES[2], ARTICLE_FORM_DATA_PROPERTIES),
      );

      component.ngOnInit();
      expect(component.form.controls.bannerImageId.value).toBe(
        MOCK_ARTICLES[2].bannerImageId,
      );

      component.onRevertBannerImage();

      expect(component.form.controls.bannerImageId.value).toBe(
        MOCK_ARTICLES[3].bannerImageId,
      );
    });

    it('should patch value to empty string otherwise', async () => {
      fixture.componentRef.setInput('originalArticle', null);
      fixture.componentRef.setInput(
        'formData',
        pick(MOCK_ARTICLES[2], ARTICLE_FORM_DATA_PROPERTIES),
      );

      component.ngOnInit();
      expect(component.form.controls.bannerImageId.value).toBe(
        MOCK_ARTICLES[2].bannerImageId,
      );

      component.onRevertBannerImage();

      expect(component.form.controls.bannerImageId.value).toBe('');
    });
  });

  describe('onInsertImage', () => {
    it('should insert selected image within body text at current cursor position', async () => {
      const imageId = 'abc123';
      dialogOpenSpy.mockResolvedValue(`${imageId}-thumb`);
      component['lastCursorPosition'] = 3;
      component.form.patchValue({ body: 'Some text' });
      vi.clearAllMocks();

      await component.onInsertImage();

      expect(dialogOpenSpy).toHaveBeenCalledWith({
        componentType: ImageExplorerComponent,
        isModal: true,
      });
      expect(component.form.controls.body.value).toBe(
        'Som\n\n{{{abc123}}}(((500)))<<<Image caption goes here>>>\n\ne text',
      );
    });

    it('should not alter body text if dialog is closed', async () => {
      dialogOpenSpy.mockResolvedValue('close');
      component['lastCursorPosition'] = 3;
      component.form.patchValue({ body: 'Some text' });
      vi.clearAllMocks();

      await component.onInsertImage();

      expect(dialogOpenSpy).toHaveBeenCalledWith({
        componentType: ImageExplorerComponent,
        isModal: true,
      });
      expect(component.form.controls.body.value).toBe('Some text');
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
      component.form.patchValue({ title: '' });
      component.form.markAsPristine();
      component.form.markAsUntouched();
      fixture.detectChanges();

      await component.onSubmit();

      expect(component.form.controls.title.touched).toBe(true);
      expect(component.form.touched).toBe(true);
      expect(dialogOpenSpy).not.toHaveBeenCalled();
    });

    it('should publish a new article from the confirmation dialog', async () => {
      fixture.componentRef.setInput('originalArticle', null);
      fixture.componentRef.setInput(
        'formData',
        pick(MOCK_ARTICLES[3], ARTICLE_FORM_DATA_PROPERTIES),
      );

      await component.onSubmit();
      await lastOpenedDialog(dialogOpenSpy).confirmAction?.();

      expect(dialogOpenSpy).toHaveBeenCalledWith({
        componentType: BasicDialogComponent,
        isModal: false,
        inputs: {
          dialog: expect.objectContaining({
            title: 'Confirm',
            body: `Publish ${MOCK_ARTICLES[3].title} to News page?`,
            confirmButtonText: 'Publish',
          }),
        },
      });
      expect(storeRequestSpy).toHaveBeenCalledWith(
        ArticlesActions.publishArticleRequested(),
        [ArticlesActions.publishArticleSucceeded, ArticlesActions.publishArticleFailed],
      );
    });

    it('should update an existing article from the confirmation dialog', async () => {
      fixture.componentRef.setInput('originalArticle', MOCK_ARTICLES[2]);
      fixture.componentRef.setInput(
        'formData',
        pick(MOCK_ARTICLES[3], ARTICLE_FORM_DATA_PROPERTIES),
      );

      await component.onSubmit();
      await lastOpenedDialog(dialogOpenSpy).confirmAction?.();

      expect(dialogOpenSpy).toHaveBeenCalledWith({
        componentType: BasicDialogComponent,
        isModal: false,
        inputs: {
          dialog: expect.objectContaining({
            title: 'Confirm',
            body: `Update ${MOCK_ARTICLES[2].title} article?`,
            confirmButtonText: 'Update',
          }),
        },
      });
      expect(storeRequestSpy).toHaveBeenCalledWith(
        ArticlesActions.updateArticleRequested({ articleId: MOCK_ARTICLES[2].id }),
        [ArticlesActions.updateArticleSucceeded, ArticlesActions.updateArticleFailed],
      );
    });

    it('should not save anything until the dialog is confirmed', async () => {
      dialogOpenSpy.mockResolvedValue('cancel');
      fixture.componentRef.setInput(
        'formData',
        pick(MOCK_ARTICLES[3], ARTICLE_FORM_DATA_PROPERTIES),
      );
      fixture.componentRef.setInput('originalArticle', null);

      await component.onSubmit();

      expect(dialogOpenSpy).toHaveBeenCalledTimes(1);
      expect(storeRequestSpy).not.toHaveBeenCalled();
    });
  });

  describe('body image management', () => {
    describe('bodyImageCount', () => {
      it('should return 0 when body has no images', () => {
        component.form.patchValue({ body: 'Some text without images' });

        expect(component.bodyImageCount).toBe(0);
      });

      it('should count image placeholders correctly', () => {
        component.form.patchValue({
          body: 'Text {{{image1}}} more text {{{image2}}} end',
        });

        expect(component.bodyImageCount).toBe(2);
      });

      it('should count all image placeholders even if more than limit', () => {
        component.form.patchValue({
          body: '{{{img1}}} {{{img2}}} {{{img3}}} {{{img4}}}',
        });

        expect(component.bodyImageCount).toBe(4);
      });
    });

    describe('canInsertImage', () => {
      it('should return true when no images in body', () => {
        component.form.patchValue({ body: 'No images here' });

        expect(component.canInsertImage).toBe(true);
      });

      it('should return true when body has fewer than MAX_ARTICLE_BODY_IMAGES', () => {
        component.form.patchValue({ body: '{{{img1}}} {{{img2}}}' });

        expect(component.canInsertImage).toBe(true);
      });

      it('should return false when body has MAX_ARTICLE_BODY_IMAGES or more', () => {
        component.form.patchValue({
          body: '{{{img1}}} {{{img2}}} {{{img3}}} {{{img4}}} {{{img5}}}',
        });

        expect(component.canInsertImage).toBe(false);
      });
    });

    describe('onBodyTextareaInteraction', () => {
      it('should capture cursor position on interaction', () => {
        const textarea = document.createElement('textarea');
        textarea.value = 'Some text content for testing cursor tracking';
        textarea.selectionStart = 10;
        textarea.selectionEnd = 35;
        const event = { target: textarea } as unknown as Event;

        component.onBodyTextareaInteraction(event);

        // @ts-expect-error Private property - Should capture the selectionEnd position
        expect(component.lastCursorPosition).toBe(35);
      });
    });

    describe('onInsertImage', () => {
      beforeEach(() => {
        dialogOpenSpy.mockResolvedValue('img-test-image-id');
      });

      it('should open image explorer dialog', async () => {
        await component.onInsertImage();

        expect(dialogOpenSpy).toHaveBeenCalledWith({
          componentType: ImageExplorerComponent,
          isModal: true,
        });
      });

      it('should insert image placeholder at cursor position', async () => {
        component.form.patchValue({ body: 'Start End' });
        // @ts-expect-error Private property
        component.lastCursorPosition = 6;

        await component.onInsertImage();

        expect(component.form.controls.body.value).toContain('{{{img}}}');
      });

      it('should insert at end if cursor position is 0', async () => {
        component.form.patchValue({ body: 'Existing text' });
        // @ts-expect-error Private property
        component.lastCursorPosition = 0;

        await component.onInsertImage();

        expect(component.form.controls.body.value).toContain('{{{img}}}');
        expect(component.form.controls.body.value).toContain('Existing text');
      });

      it('should not insert if dialog is cancelled', async () => {
        dialogOpenSpy.mockResolvedValue('close');
        component.form.patchValue({ body: 'Original text' });

        await component.onInsertImage();

        expect(component.form.controls.body.value).toBe('Original text');
      });
    });

    describe('body images', () => {
      it('should replace image URLs with IDs but leave existing IDs alone', () => {
        const imageId1 = '507f1f77bcf86cd799439011';
        const imageId2 = '507f191e810c19729de860ea';

        component.form.patchValue({
          body: `Text {{{https://s3.amazonaws.com/bucket/${imageId1}}}} more {{{${imageId2}}}}`,
        });
        const mockImages = [
          {
            ...MOCK_IMAGES[0],
            id: imageId1,
            mainUrl: 'http://example.com/img1.jpg',
            mainWidth: 500,
            caption: 'Test caption 1',
          },
          {
            ...MOCK_IMAGES[1],
            id: imageId2,
            mainUrl: 'http://example.com/img2.jpg',
            mainWidth: 600,
            caption: 'Test caption 2',
          },
        ];

        fixture.componentRef.setInput('bodyImages', mockImages);
        fixture.detectChanges();

        const body = component.form.controls.body.value;
        // URL should be expanded
        expect(body).toContain(`{{{${imageId1}}}}(((500)))<<<Test caption 1>>>`);
        // Existing ID should be left as is (bare)
        expect(body).toContain(`{{{${imageId2}}}}`);
        expect(body).not.toContain(`{{{${imageId2}}}}(((600)))<<<Test caption 2>>>`);
      });
    });
  });

  describe('template rendering', () => {
    describe('modification info', () => {
      it('should render if originalArticle is defined', () => {
        fixture.componentRef.setInput('originalArticle', MOCK_ARTICLES[0]);
        fixture.detectChanges();

        expect(query(fixture.debugElement, 'lcc-modification-info')).toBeTruthy();
      });

      it('should not render if originalArticle is null', () => {
        fixture.componentRef.setInput('originalArticle', null);
        fixture.detectChanges();

        expect(query(fixture.debugElement, 'lcc-modification-info')).toBeFalsy();
      });
    });

    describe('select banner image button', () => {
      it('should call onSelectBannerImage when clicked', async () => {
        dialogOpenSpy.mockResolvedValue('close');
        const selectBannerImageButton = query(
          fixture.debugElement,
          '.select-banner-image-button',
        );
        selectBannerImageButton.triggerEventHandler('click');

        expect(selectBannerImageButton.nativeElement.disabled).toBe(false);
        expect(selectBannerImageSpy).toHaveBeenCalledTimes(1);
      });
    });

    describe('revert banner image button', () => {
      it('should be disabled if original banner image is already set', () => {
        component.form.controls.bannerImageId.setValue('same-id');
        fixture.componentRef.setInput('originalArticle', {
          ...MOCK_ARTICLES[1],
          bannerImageId: 'same-id',
        });
        fixture.detectChanges();

        expect(
          query(fixture.debugElement, '.revert-banner-image-button').nativeElement
            .disabled,
        ).toBe(true);
      });

      it('should be enabled if current banner image differs from originalArticle banner image', () => {
        component.form.controls.bannerImageId.setValue('mock-id');
        fixture.componentRef.setInput('originalArticle', {
          ...MOCK_ARTICLES[1],
          bannerImageId: 'different-id',
        });
        fixture.detectChanges();

        const revertBannerImageButton = query(
          fixture.debugElement,
          '.revert-banner-image-button',
        );
        revertBannerImageButton.triggerEventHandler('click');

        expect(revertBannerImageButton.nativeElement.disabled).toBe(false);
        expect(revertBannerImageSpy).toHaveBeenCalledTimes(1);
      });
    });

    describe('insert image button', () => {
      it('should call onInsertImage when clicked', async () => {
        dialogOpenSpy.mockResolvedValue('close');
        const insertImageButton = query(fixture.debugElement, '.insert-image-button');
        insertImageButton.triggerEventHandler('click');

        expect(insertImageButton.nativeElement.disabled).toBe(false);
        expect(insertImageSpy).toHaveBeenCalledTimes(1);
      });

      it('should be disabled when MAX_ARTICLE_BODY_IMAGES limit is reached', () => {
        component.form.patchValue({
          body: '{{{img1}}} {{{img2}}} {{{img3}}} {{{img4}}} {{{img5}}}',
        });

        expect(component.canInsertImage).toBe(false);
        expect(component.bodyImageCount).toBe(5);
      });

      it('should be enabled when below MAX_ARTICLE_BODY_IMAGES limit', () => {
        component.form.patchValue({ body: '{{{img1}}} {{{img2}}}' });
        fixture.detectChanges();

        const insertImageButton = query(fixture.debugElement, '.insert-image-button');

        expect(insertImageButton.nativeElement.disabled).toBe(false);
        expect(component.canInsertImage).toBe(true);
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
        component.form.setValue(pick(MOCK_ARTICLES[3], ARTICLE_FORM_DATA_PROPERTIES));
        fixture.componentRef.setInput('hasUnsavedChanges', false);
        fixture.detectChanges();

        const submitButton = query(fixture.debugElement, '.submit-button');
        expect(submitButton.nativeElement.disabled).toBe(true);
      });

      it('should be disabled if the form is invalid', () => {
        component.form.setValue({
          ...pick(MOCK_ARTICLES[3], ARTICLE_FORM_DATA_PROPERTIES),
          body: '', // Invalid - body is a required field
        });
        fixture.componentRef.setInput('hasUnsavedChanges', true);
        fixture.detectChanges();

        const submitButton = query(fixture.debugElement, '.submit-button');
        expect(submitButton.nativeElement.disabled).toBe(true);
      });

      it('should be enabled if there are unsaved changes and the form is valid', () => {
        fixture.componentRef.setInput('hasUnsavedChanges', true);
        component.form.setValue(pick(MOCK_ARTICLES[3], ARTICLE_FORM_DATA_PROPERTIES));
        query(fixture.debugElement, 'form').triggerEventHandler('ngSubmit');
        fixture.detectChanges();

        const submitButton = query(fixture.debugElement, '.submit-button');

        expect(submitButton.nativeElement.disabled).toBe(false);
        expect(submitSpy).toHaveBeenCalledTimes(1);
      });
    });
  });
});
