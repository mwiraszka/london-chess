import { ButtonComponent, DialogService } from '@eagami/ui';
import { provideMockStore } from '@ngrx/store/testing';
import { pick } from 'lodash';
import { provideMarkdown } from 'ngx-markdown';

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { BasicDialogComponent } from '@app/components/basic-dialog/basic-dialog.component';
import { ImageExplorerComponent } from '@app/components/image-explorer/image-explorer.component';
import {
  ARTICLE_FORM_DATA_PROPERTIES,
  INITIAL_ARTICLE_FORM_DATA,
  MAX_ARTICLE_BODY_IMAGES,
} from '@app/constants';
import { FORM_CHANGE_DEBOUNCE, FORM_ERROR_MESSAGES } from '@app/constants/forms';
import { MOCK_ARTICLES } from '@app/mocks/articles.mock';
import { MOCK_IMAGES } from '@app/mocks/images.mock';
import { Article, ArticleFormData, Image } from '@app/models';
import { StoreRequestService } from '@app/services';
import { ArticlesActions } from '@app/store/articles';
import { initialState as membersInitialState } from '@app/store/members/members.reducer';
import { closedDialogRef, lastOpenedDialog, query, queryTextContent } from '@app/utils';

import { ArticleFormComponent } from './article-form.component';

describe('ArticleFormComponent', () => {
  let fixture: ComponentFixture<ArticleFormComponent>;
  let component: ArticleFormComponent;

  let cancelSpy: MockInstance;
  let changeSpy: MockInstance;
  let dialogOpenSpy: Mock;
  let requestFetchMainImageSpy: MockInstance;
  let restoreSpy: MockInstance;
  let storeRequestSpy: Mock;

  const formData: ArticleFormData = {
    title: 'Club notice',
    body: 'Doors open at 6.',
    bannerImageId: MOCK_IMAGES[0].id,
  };
  const originalArticle: Article = MOCK_ARTICLES[2];

  function render(
    data: ArticleFormData = formData,
    hasUnsavedChanges = false,
    article: Article | null = null,
    bannerImage: Image | null = MOCK_IMAGES[0],
  ): void {
    fixture = TestBed.createComponent(ArticleFormComponent);
    component = fixture.componentInstance;
    cancelSpy = vi.spyOn(component.cancel, 'emit');
    changeSpy = vi.spyOn(component.change, 'emit');
    requestFetchMainImageSpy = vi.spyOn(component.requestFetchMainImage, 'emit');
    restoreSpy = vi.spyOn(component.restore, 'emit');

    fixture.componentRef.setInput('bannerImage', bannerImage);
    fixture.componentRef.setInput('bodyImages', []);
    fixture.componentRef.setInput('formData', data);
    fixture.componentRef.setInput('hasUnsavedChanges', hasUnsavedChanges);
    fixture.componentRef.setInput('originalArticle', article);
    fixture.detectChanges();
  }

  async function settle(): Promise<void> {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  const lastDraft = (): Partial<ArticleFormData> => changeSpy.mock.lastCall?.[0].formData;

  const button = (selector: string): ButtonComponent =>
    query(fixture.debugElement, selector).componentInstance;

  const errorTexts = (): string[] =>
    Array.from<HTMLElement>(fixture.nativeElement.querySelectorAll('[role="alert"]')).map(
      element => element.textContent?.trim() ?? '',
    );

  const bodyTextarea = (): HTMLTextAreaElement =>
    query(fixture.debugElement, 'ea-textarea textarea').nativeElement;

  const typeBody = (body: string): void => {
    bodyTextarea().value = body;
    bodyTextarea().dispatchEvent(new Event('input'));
    fixture.detectChanges();
  };

  const leaveBodyWithCaretAt = (position: number): void => {
    bodyTextarea().setSelectionRange(position, position);
    bodyTextarea().dispatchEvent(new FocusEvent('blur'));
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ArticleFormComponent],
      providers: [
        provideMockStore({ initialState: { membersState: membersInitialState } }),
        provideMarkdown(),
        provideRouter([]),
        { provide: DialogService, useValue: { open: vi.fn(() => closedDialogRef()) } },
        {
          provide: StoreRequestService,
          useValue: { dispatch: vi.fn().mockResolvedValue(null) },
        },
      ],
    }).compileComponents();

    dialogOpenSpy = vi.mocked(TestBed.inject(DialogService).open);
    storeRequestSpy = vi.mocked(TestBed.inject(StoreRequestService).dispatch);
  });

  describe('initialization', () => {
    it('should fill each field from the form data', () => {
      render();

      expect(component.form.getRawValue()).toEqual(formData);
    });

    it('should ask for the banner image only when it is not loaded yet', () => {
      render(formData, false, null, MOCK_IMAGES[0]);
      const whenLoaded = requestFetchMainImageSpy.mock.calls.length;
      fixture.destroy();

      render(formData, false, null, null);

      expect(whenLoaded).toBe(0);
      expect(requestFetchMainImageSpy).toHaveBeenCalledWith(formData.bannerImageId);
    });

    it('should not ask for a banner image the article does not have yet', () => {
      render({ ...INITIAL_ARTICLE_FORM_DATA }, false, null, null);

      expect(requestFetchMainImageSpy).not.toHaveBeenCalled();
    });

    it('should start a fresh form without any errors showing', async () => {
      render({ ...INITIAL_ARTICLE_FORM_DATA }, false, null, null);

      await settle();

      expect(component.form.invalid).toBe(true);
      expect(component.form.touched).toBe(false);
      expect(errorTexts()).toEqual([]);
    });

    it('should show the errors of a restored draft straight away', async () => {
      render({ ...formData, title: '', bannerImageId: '' }, true, null, null);

      await settle();

      expect(component.form.controls.title.touched).toBe(true);
      expect(errorTexts()).toHaveLength(2);
      expect(errorTexts()).toContain('Choose a banner image');
    });

    it('should pass the draft to the store as soon as the form opens', () => {
      render(formData, false, originalArticle);

      expect(changeSpy).toHaveBeenCalledTimes(1);
      expect(changeSpy).toHaveBeenCalledWith({
        articleId: originalArticle.id,
        formData,
      });
    });
  });

  describe('keeping the draft', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      render();
      changeSpy.mockClear();
    });

    afterEach(() => vi.useRealTimers());

    it('should pass changes on once typing pauses', () => {
      component.form.controls.title.setValue('Club');
      component.form.controls.title.setValue('Club closure');
      vi.advanceTimersByTime(FORM_CHANGE_DEBOUNCE - 1);
      const beforePause = changeSpy.mock.calls.length;

      vi.advanceTimersByTime(1);

      expect(beforePause).toBe(0);
      expect(changeSpy).toHaveBeenCalledTimes(1);
      expect(lastDraft()).toEqual({ ...formData, title: 'Club closure' });
    });

    it('should pass the draft on at once when the form is submitted', async () => {
      dialogOpenSpy.mockReturnValue(closedDialogRef('cancel'));
      component.form.controls.body.setValue('Doors open at 7.');

      await component.onSubmit();

      expect(lastDraft()).toEqual(expect.objectContaining({ body: 'Doors open at 7.' }));
    });

    it('should pass the draft on at once when focus leaves a field', () => {
      component.form.controls.title.setValue('Club closure');

      query(fixture.debugElement, 'form').triggerEventHandler('focusout');

      expect(lastDraft()).toEqual(expect.objectContaining({ title: 'Club closure' }));
    });
  });

  describe('validation', () => {
    beforeEach(() => render());

    it('should require every field', () => {
      component.form.setValue({ bannerImageId: '', title: '', body: '' });

      expect(component.form.controls.bannerImageId.hasError('required')).toBe(true);
      expect(component.form.controls.title.hasError('required')).toBe(true);
      expect(component.form.controls.body.hasError('required')).toBe(true);
    });

    it('should accept any text a person might type, emoji included', () => {
      component.form.patchValue({ title: 'Rapid 🔥 night', body: '## Café\n\n7–9 PM' });

      expect(component.form.valid).toBe(true);
    });

    it('should reject text with control characters', () => {
      component.form.patchValue({ title: 'Bell \u0007' });

      expect(component.form.controls.title.hasError('invalidText')).toBe(true);
    });

    it("should explain the app's own validation errors under the field", async () => {
      component.form.controls.title.setValue('Bell \u0007');
      component.form.controls.title.markAsTouched();

      await settle();

      expect(errorTexts()).toEqual([FORM_ERROR_MESSAGES['invalidText']]);
    });
  });

  describe('banner image', () => {
    it('should use the image chosen in the explorer and fetch it', async () => {
      render();
      const imageId = '6aa3f2ed7038c5ed088ad9e1';
      dialogOpenSpy.mockReturnValue(closedDialogRef(`${imageId}-thumb`));

      await component.onSelectBannerImage();

      expect(dialogOpenSpy).toHaveBeenCalledWith(ImageExplorerComponent);
      expect(component.form.controls.bannerImageId.value).toBe(imageId);
      expect(requestFetchMainImageSpy).toHaveBeenCalledWith(imageId);
    });

    it('should keep the banner image when the explorer is closed', async () => {
      render();
      dialogOpenSpy.mockReturnValue(closedDialogRef());

      await component.onSelectBannerImage();

      expect(component.form.controls.bannerImageId.value).toBe(formData.bannerImageId);
      expect(requestFetchMainImageSpy).not.toHaveBeenCalled();
    });

    it('should put back the original banner image of an existing article', () => {
      render(formData, true, originalArticle);

      query(fixture.debugElement, '.revert-banner-image-button').triggerEventHandler(
        'clicked',
      );

      expect(component.form.controls.bannerImageId.value).toBe(
        originalArticle.bannerImageId,
      );
    });

    it('should clear the banner image of a new article', () => {
      render(formData, true, null);

      component.onRevertBannerImage();

      expect(component.form.controls.bannerImageId.value).toBe('');
    });

    it('should only offer to put back the banner image once it has changed', () => {
      render(
        { ...formData, bannerImageId: originalArticle.bannerImageId },
        false,
        originalArticle,
      );
      const whenOriginal = button('.revert-banner-image-button').disabled();

      component.form.controls.bannerImageId.setValue(MOCK_IMAGES[3].id);
      fixture.detectChanges();

      expect(whenOriginal).toBe(true);
      expect(button('.revert-banner-image-button').disabled()).toBe(false);
    });

    it('should open the explorer from the choose button', () => {
      render();
      dialogOpenSpy.mockReturnValue(closedDialogRef());

      query(fixture.debugElement, '.select-banner-image-button').triggerEventHandler(
        'clicked',
      );

      expect(dialogOpenSpy).toHaveBeenCalledWith(ImageExplorerComponent);
    });
  });

  describe('body images', () => {
    beforeEach(() => render());

    it('should insert the chosen image where the caret left the body', async () => {
      dialogOpenSpy.mockReturnValue(closedDialogRef('img-thumb'));
      typeBody('Before After');
      leaveBodyWithCaretAt(6);

      await component.onInsertImage();

      expect(component.form.controls.body.value).toBe(
        'Before\n\n{{{img}}}(((500)))<<<Image caption goes here>>>\n\n After',
      );
    });

    it('should insert at the very start when the caret was left there', async () => {
      dialogOpenSpy.mockReturnValue(closedDialogRef('img-thumb'));
      typeBody('After');
      leaveBodyWithCaretAt(0);

      await component.onInsertImage();

      expect(component.form.controls.body.value).toBe(
        '\n\n{{{img}}}(((500)))<<<Image caption goes here>>>\n\nAfter',
      );
    });

    it('should add the image to the end when the body never had the caret', async () => {
      dialogOpenSpy.mockReturnValue(closedDialogRef('img-thumb'));

      await component.onInsertImage();

      expect(component.form.controls.body.value).toBe(
        `${formData.body}\n\n{{{img}}}(((500)))<<<Image caption goes here>>>\n\n`,
      );
    });

    it('should leave the body alone when the explorer is closed', async () => {
      dialogOpenSpy.mockReturnValue(closedDialogRef());

      await component.onInsertImage();

      expect(component.form.controls.body.value).toBe(formData.body);
    });

    it('should count the images in the body', () => {
      typeBody('Text {{{image1}}} more text {{{image2}}} end');

      expect(component.bodyImageCount).toBe(2);
      expect(component.canInsertImage).toBe(true);
    });

    it('should stop offering images once the body holds the most it can', () => {
      const enabledBelow = !button('.insert-image-button').disabled();

      typeBody('{{{img1}}} '.repeat(MAX_ARTICLE_BODY_IMAGES));

      expect(enabledBelow).toBe(true);
      expect(component.canInsertImage).toBe(false);
      expect(button('.insert-image-button').disabled()).toBe(true);
    });

    it('should open the explorer from the insert button', () => {
      dialogOpenSpy.mockReturnValue(closedDialogRef());

      query(fixture.debugElement, '.insert-image-button').triggerEventHandler('clicked');

      expect(dialogOpenSpy).toHaveBeenCalledWith(ImageExplorerComponent);
    });

    it('should fill in the width and caption of a body image given by its address', () => {
      const addressedId = '507f1f77bcf86cd799439011';
      const bareId = '507f191e810c19729de860ea';
      typeBody(
        `Text {{{https://s3.amazonaws.com/bucket/${addressedId}}}} more {{{${bareId}}}}`,
      );

      fixture.componentRef.setInput('bodyImages', [
        { ...MOCK_IMAGES[0], id: addressedId, mainWidth: 500, caption: 'First board' },
        { ...MOCK_IMAGES[1], id: bareId, mainWidth: 600, caption: 'Second board' },
      ]);
      fixture.detectChanges();

      const body = component.form.controls.body.value;
      expect(body).toContain(`{{{${addressedId}}}}(((500)))<<<First board>>>`);
      expect(body).toContain(`{{{${bareId}}}}`);
      expect(body).not.toContain('Second board');
    });
  });

  describe('restoring', () => {
    it('should put the original article back once confirmed', async () => {
      render({ ...formData, title: 'Changed title' }, true, originalArticle);
      component.form.markAllAsTouched();
      dialogOpenSpy.mockReturnValue(closedDialogRef('confirm'));

      await component.onRestore();

      expect(lastOpenedDialog(dialogOpenSpy)).toEqual({
        title: 'Confirm',
        body: 'Revert to the original article data? All changes will be lost.',
        confirmButtonText: 'Revert',
        confirmButtonType: 'warning',
      });
      expect(restoreSpy).toHaveBeenCalledWith(originalArticle.id);
      expect(component.form.getRawValue()).toEqual(
        pick(originalArticle, ARTICLE_FORM_DATA_PROPERTIES),
      );
      expect(component.form.touched).toBe(false);
    });

    it('should fetch the original banner image when the draft had replaced it', async () => {
      render(formData, true, originalArticle);
      dialogOpenSpy.mockReturnValue(closedDialogRef('confirm'));

      await component.onRestore();

      expect(requestFetchMainImageSpy).toHaveBeenCalledWith(
        originalArticle.bannerImageId,
      );
    });

    it('should empty a new article back to its starting values', async () => {
      render(formData, true, null);
      dialogOpenSpy.mockReturnValue(closedDialogRef('confirm'));

      await component.onRestore();

      expect(restoreSpy).toHaveBeenCalledWith(null);
      expect(component.form.getRawValue()).toEqual(INITIAL_ARTICLE_FORM_DATA);
      expect(requestFetchMainImageSpy).not.toHaveBeenCalled();
    });

    it('should change nothing when cancelled', async () => {
      render({ ...formData, title: 'Changed title' }, true, originalArticle);
      dialogOpenSpy.mockReturnValue(closedDialogRef('cancel'));

      await component.onRestore();

      expect(restoreSpy).not.toHaveBeenCalled();
      expect(component.form.controls.title.value).toBe('Changed title');
    });
  });

  describe('submitting', () => {
    it('should show every error instead of asking to save an invalid form', async () => {
      render({ ...INITIAL_ARTICLE_FORM_DATA, title: 'Club notice' }, false, null, null);
      await settle();
      const errorsBefore = errorTexts();

      query(fixture.debugElement, 'form').triggerEventHandler('ngSubmit');
      await settle();

      expect(errorsBefore).toEqual([]);
      expect(errorTexts()).toHaveLength(2);
      expect(errorTexts()).toContain('Choose a banner image');
      expect(dialogOpenSpy).not.toHaveBeenCalled();
    });

    it('should publish a new article from the confirmation dialog', async () => {
      render(formData, true, null);

      await component.onSubmit();
      await lastOpenedDialog(dialogOpenSpy).confirmAction?.();

      expect(dialogOpenSpy).toHaveBeenCalledWith(BasicDialogComponent, expect.anything());
      expect(lastOpenedDialog(dialogOpenSpy)).toEqual(
        expect.objectContaining({
          body: `Publish ${formData.title} to News page?`,
          confirmButtonText: 'Publish',
        }),
      );
      expect(storeRequestSpy).toHaveBeenCalledWith(
        ArticlesActions.publishArticleRequested(),
        [ArticlesActions.publishArticleSucceeded, ArticlesActions.publishArticleFailed],
      );
    });

    it('should update an existing article from the confirmation dialog', async () => {
      render(formData, true, originalArticle);

      await component.onSubmit();
      await lastOpenedDialog(dialogOpenSpy).confirmAction?.();

      expect(lastOpenedDialog(dialogOpenSpy)).toEqual(
        expect.objectContaining({
          body: `Update ${originalArticle.title} article?`,
          confirmButtonText: 'Update',
        }),
      );
      expect(storeRequestSpy).toHaveBeenCalledWith(
        ArticlesActions.updateArticleRequested({ articleId: originalArticle.id }),
        [ArticlesActions.updateArticleSucceeded, ArticlesActions.updateArticleFailed],
      );
    });

    it('should save nothing until the dialog is confirmed', async () => {
      render(formData, true, null);
      dialogOpenSpy.mockReturnValue(closedDialogRef('cancel'));

      await component.onSubmit();

      expect(dialogOpenSpy).toHaveBeenCalledTimes(1);
      expect(storeRequestSpy).not.toHaveBeenCalled();
    });
  });

  describe('template', () => {
    it('should preview the body as it is written', () => {
      render();

      typeBody('## Preview');

      expect(
        query(fixture.debugElement, 'lcc-markdown-renderer').componentInstance.data(),
      ).toBe('## Preview');
    });

    it('should not preview an empty body', () => {
      render();

      typeBody('');

      expect(query(fixture.debugElement, 'lcc-markdown-renderer')).toBeNull();
      expect(query(fixture.debugElement, '.preview-divider')).toBeNull();
    });

    it('should show who created and edited an existing article only', () => {
      render(formData, false, MOCK_ARTICLES[0]);
      const forExisting = query(fixture.debugElement, 'lcc-modification-info');
      fixture.destroy();

      render(formData, false, null);

      expect(forExisting).toBeTruthy();
      expect(query(fixture.debugElement, 'lcc-modification-info')).toBeFalsy();
    });

    it('should only offer to discard or save once something has changed', () => {
      render(formData, false);
      const restoreWithout = button('.restore-button').disabled();
      const submitWithout = button('.submit-button').disabled();
      fixture.destroy();

      render(formData, true);

      expect(restoreWithout).toBe(true);
      expect(submitWithout).toBe(true);
      expect(button('.restore-button').disabled()).toBe(false);
      expect(button('.submit-button').disabled()).toBe(false);
    });

    it('should disable the save button while the form is invalid', () => {
      render({ ...formData, body: '' }, true);

      expect(button('.submit-button').disabled()).toBe(true);
    });

    it('should cancel from the cancel button', () => {
      render();

      query(fixture.debugElement, '.cancel-button').triggerEventHandler('clicked');

      expect(cancelSpy).toHaveBeenCalledTimes(1);
    });

    it('should label the save button for publishing or updating', () => {
      render(formData, true, null);
      const publishing = queryTextContent(fixture.debugElement, '.submit-button');
      fixture.destroy();

      render(formData, true, originalArticle);

      expect(publishing).toBe('Publish article');
      expect(queryTextContent(fixture.debugElement, '.submit-button')).toBe(
        'Update article',
      );
    });
  });
});
