import {
  HistoryIconComponent,
  ImageIconComponent,
  RotateCcwIconComponent,
} from '@eagami/ui';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { debounceTime } from 'rxjs/operators';

import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  effect,
  inject,
  input,
  output,
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
import { ImageExplorerComponent } from '@app/components/image-explorer/image-explorer.component';
import { ImageComponent } from '@app/components/image/image.component';
import { MarkdownRendererComponent } from '@app/components/markdown-renderer/markdown-renderer.component';
import { ModificationInfoComponent } from '@app/components/modification-info/modification-info.component';
import { MAX_ARTICLE_BODY_IMAGES } from '@app/constants';
import { TooltipDirective } from '@app/directives/tooltip.directive';
import {
  Article,
  ArticleFormData,
  ArticleFormGroup,
  BasicDialogResult,
  Dialog,
  Id,
  Image,
} from '@app/models';
import { DialogService, StoreRequestService } from '@app/services';
import { ArticlesActions } from '@app/store/articles';
import { isCollectionId } from '@app/utils';
import { textValidator } from '@app/validators';

@UntilDestroy()
@Component({
  selector: 'lcc-article-form',
  templateUrl: './article-form.component.html',
  styleUrl: './article-form.component.scss',
  imports: [
    FormErrorIconComponent,
    HistoryIconComponent,
    ImageComponent,
    ImageIconComponent,
    MarkdownRendererComponent,
    ModificationInfoComponent,
    ReactiveFormsModule,
    RotateCcwIconComponent,
    TooltipDirective,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArticleFormComponent implements OnInit {
  private readonly dialogService = inject(DialogService);
  private readonly formBuilder = inject(FormBuilder);

  readonly bannerImage = input.required<Image | null>();
  readonly bodyImages = input.required<Image[]>();
  readonly formData = input.required<ArticleFormData>();
  readonly hasUnsavedChanges = input.required<boolean>();
  readonly originalArticle = input.required<Article | null>();

  readonly cancel = output<void>();
  readonly change = output<{
    articleId: Id | null;
    formData: Partial<ArticleFormData>;
  }>();
  readonly requestFetchMainImage = output<Id>();
  readonly restore = output<Id | null>();

  public form!: FormGroup<ArticleFormGroup>;
  public readonly maxBodyImages = MAX_ARTICLE_BODY_IMAGES;

  private lastCursorPosition = 0;

  private readonly storeRequests = inject(StoreRequestService);

  public get bodyImageCount(): number {
    const body = this.form?.controls.body.value || '';
    const imagePattern = /{{{([^}]+)}}}/g;
    const matches = body.match(imagePattern);
    return matches ? matches.length : 0;
  }

  public get canInsertImage(): boolean {
    return this.bodyImageCount < MAX_ARTICLE_BODY_IMAGES;
  }

  public ngOnInit(): void {
    const formData = this.formData();
    if (!this.bannerImage() && formData.bannerImageId) {
      this.requestFetchMainImage.emit(formData.bannerImageId);
    }

    this.initForm();
    this.initFormValueChangeListener();

    if (this.hasUnsavedChanges()) {
      this.form.markAllAsTouched();
    }
  }

  constructor() {
    effect(() => {
      const bodyImages = this.bodyImages();
      if (this.form) {
        this.expandBodyImageTags(bodyImages);
      }
    });
  }

  private expandBodyImageTags(bodyImages: Image[]): void {
    let body = this.form.controls.body.value;

    // Match all image patterns in the body
    const imagePattern = /{{{([^}]+)}}}(?:\(\(\(([^)]*)\)\)\))?(?:<<<([\s\S]*?)>>>)?/g;
    let match: RegExpExecArray | null;
    const replacements: Array<{ oldString: string; newString: string }> = [];

    while ((match = imagePattern.exec(body)) !== null) {
      const content = match[1];
      const width = match[2];
      const caption = match[3];

      const imageId = content.match(/[a-f\d]{24}/)?.[0];

      if (imageId) {
        const image = bodyImages.find(img => img.id === imageId);

        if (image && !isCollectionId(content)) {
          const newString = `{{{${imageId}}}}(((${width || image.mainWidth})))<<<${caption || image.caption}>>>`;

          replacements.push({
            oldString: match[0],
            newString,
          });
        }
      }
    }

    // Apply all replacements
    replacements.forEach(({ oldString, newString }) => {
      body = body.replace(oldString, newString);
    });

    // Update the form if any replacements were made
    if (replacements.length > 0) {
      this.form.patchValue({ body }, { emitEvent: false });
    }
  }

  public async onRestore(): Promise<void> {
    const dialog: Dialog = {
      title: 'Confirm',
      body: 'Restore original article data? All changes will be lost.',
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

    this.restore.emit(this.originalArticle()?.id ?? null);

    setTimeout(() => this.ngOnInit());
  }

  public async onSelectBannerImage(): Promise<void> {
    const dialogResponse = await this.dialogService.open<ImageExplorerComponent, Id>({
      componentType: ImageExplorerComponent,
      isModal: true,
    });

    if (dialogResponse !== 'close') {
      const imageId = dialogResponse.split('-')[0];
      this.form.patchValue({ bannerImageId: imageId });
      this.requestFetchMainImage.emit(imageId);
    }
  }

  public onRevertBannerImage(): void {
    this.form.patchValue({ bannerImageId: this.originalArticle()?.bannerImageId ?? '' });
  }

  public async onInsertImage(): Promise<void> {
    const dialogResponse = await this.dialogService.open<ImageExplorerComponent, Id>({
      componentType: ImageExplorerComponent,
      isModal: true,
    });

    if (dialogResponse !== 'close') {
      const imageId = dialogResponse.split('-')[0];

      const body = this.form.controls.body.value;
      const imageString = `{{{${imageId}}}}(((500)))<<<Image caption goes here>>>`;
      const insertIndex = this.lastCursorPosition || body.length;

      this.form.patchValue({
        body: `${body.slice(0, insertIndex)}\n\n${imageString}\n\n${body.slice(insertIndex)}`,
      });
    }
  }

  public onCancel(): void {
    this.cancel.emit();
  }

  public async onSubmit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const originalArticle = this.originalArticle();
    const dialog: Dialog = {
      title: 'Confirm',
      body: originalArticle?.title
        ? `Update ${originalArticle.title} article?`
        : `Publish ${this.formData().title} to News page?`,
      confirmButtonText: this.originalArticle() ? 'Update' : 'Publish',
      confirmAction: () => this.save(),
    };

    await this.dialogService.open<BasicDialogComponent, BasicDialogResult>({
      componentType: BasicDialogComponent,
      isModal: false,
      inputs: { dialog },
    });
  }

  private save(): Promise<unknown> {
    const originalArticle = this.originalArticle();
    return originalArticle
      ? this.storeRequests.dispatch(
          ArticlesActions.updateArticleRequested({ articleId: originalArticle.id }),
          [ArticlesActions.updateArticleSucceeded, ArticlesActions.updateArticleFailed],
        )
      : this.storeRequests.dispatch(ArticlesActions.publishArticleRequested(), [
          ArticlesActions.publishArticleSucceeded,
          ArticlesActions.publishArticleFailed,
        ]);
  }

  private initForm(): void {
    this.form = this.formBuilder.group<ArticleFormGroup>({
      bannerImageId: new FormControl(this.formData().bannerImageId, {
        nonNullable: true,
        validators: [Validators.required, textValidator],
      }),
      title: new FormControl(this.formData().title, {
        nonNullable: true,
        validators: [Validators.required, textValidator],
      }),
      body: new FormControl(this.formData().body, {
        nonNullable: true,
        validators: [Validators.required, textValidator],
      }),
    });
  }

  private initFormValueChangeListener(): void {
    this.form.valueChanges
      .pipe(debounceTime(250), untilDestroyed(this))
      .subscribe((formData: Partial<ArticleFormData>) => {
        this.change.emit({
          articleId: this.originalArticle()?.id ?? null,
          formData,
        });
      });

    // Manually trigger form data change to pass initial form data to store
    this.form.updateValueAndValidity();
  }

  /**
   * Updates the stored cursor position when the user interacts with the body textarea
   */
  public onBodyTextareaInteraction(event: Event): void {
    const textarea = event.target as HTMLTextAreaElement;
    if (textarea.selectionEnd !== undefined) {
      this.lastCursorPosition = textarea.selectionEnd;
    }
  }
}
