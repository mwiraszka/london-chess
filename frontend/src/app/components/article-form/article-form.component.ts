import {
  ButtonComponent,
  CardComponent,
  DialogService,
  DividerComponent,
  FormFieldComponent,
  HistoryIconComponent,
  ImageIconComponent,
  ImagePlusIconComponent,
  InputComponent,
  RotateCcwIconComponent,
  TextareaComponent,
  TooltipDirective,
} from '@eagami/ui';
import { pick } from 'lodash';
import { debounceTime } from 'rxjs/operators';

import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  OnInit,
  effect,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { BasicDialogComponent } from '@app/components/basic-dialog/basic-dialog.component';
import { ImageExplorerComponent } from '@app/components/image-explorer/image-explorer.component';
import { ImageComponent } from '@app/components/image/image.component';
import { MarkdownRendererComponent } from '@app/components/markdown-renderer/markdown-renderer.component';
import { ModificationInfoComponent } from '@app/components/modification-info/modification-info.component';
import {
  ARTICLE_FORM_DATA_PROPERTIES,
  INITIAL_ARTICLE_FORM_DATA,
  MAX_ARTICLE_BODY_IMAGES,
} from '@app/constants';
import { FORM_CHANGE_DEBOUNCE, FORM_ERROR_MESSAGES } from '@app/constants/forms';
import {
  Article,
  ArticleFormData,
  ArticleFormGroup,
  BasicDialogResult,
  Dialog,
  Id,
  Image,
} from '@app/models';
import { StoreRequestService } from '@app/services';
import { ArticlesActions } from '@app/store/articles';
import { isCollectionId } from '@app/utils';
import { textValidator } from '@app/validators';

@Component({
  selector: 'lcc-article-form',
  templateUrl: './article-form.component.html',
  styleUrl: './article-form.component.scss',
  imports: [
    ButtonComponent,
    CardComponent,
    DividerComponent,
    FormFieldComponent,
    ImageComponent,
    InputComponent,
    MarkdownRendererComponent,
    ModificationInfoComponent,
    ReactiveFormsModule,
    TextareaComponent,
    TooltipDirective,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArticleFormComponent implements OnInit {
  private readonly changeDetectorRef = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly dialogService = inject(DialogService);
  private readonly storeRequests = inject(StoreRequestService);

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

  protected readonly errorMessages = FORM_ERROR_MESSAGES;
  protected readonly insertImageIcon = ImagePlusIconComponent;
  protected readonly maxBodyImages = MAX_ARTICLE_BODY_IMAGES;
  protected readonly restoreIcon = HistoryIconComponent;
  protected readonly revertBannerIcon = RotateCcwIconComponent;
  protected readonly selectBannerIcon = ImageIconComponent;

  public form!: FormGroup<ArticleFormGroup>;

  private readonly bodyField = viewChild.required(TextareaComponent);

  public get bodyImageCount(): number {
    return this.form.controls.body.value.match(/{{{([^}]+)}}}/g)?.length ?? 0;
  }

  public get canInsertImage(): boolean {
    return this.bodyImageCount < MAX_ARTICLE_BODY_IMAGES;
  }

  protected get isBannerImageOriginal(): boolean {
    return (
      (this.originalArticle()?.bannerImageId ?? '') ===
      this.form.controls.bannerImageId.value
    );
  }

  protected get showBannerImageError(): boolean {
    const { bannerImageId } = this.form.controls;
    return bannerImageId.touched && bannerImageId.invalid;
  }

  constructor() {
    effect(() => {
      const bodyImages = this.bodyImages();
      if (this.form) {
        this.expandBodyImageTags(bodyImages);
      }
    });
  }

  public ngOnInit(): void {
    const formData = this.formData();
    if (!this.bannerImage() && formData.bannerImageId) {
      this.requestFetchMainImage.emit(formData.bannerImageId);
    }

    this.form = this.buildForm(formData);

    // The banner, preview and image limit read the form beyond its fields, so its
    // changes from outside a field event still have to refresh this view
    this.form.events
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.changeDetectorRef.markForCheck());

    this.form.valueChanges
      .pipe(debounceTime(FORM_CHANGE_DEBOUNCE), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.emitChange());
    this.emitChange();

    if (this.hasUnsavedChanges()) {
      this.form.markAllAsTouched();
    }
  }

  public async onRestore(): Promise<void> {
    const dialog: Dialog = {
      title: 'Confirm',
      body: 'Restore original article data? All changes will be lost.',
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

    const originalArticle = this.originalArticle();
    const restored = originalArticle
      ? pick(originalArticle, ARTICLE_FORM_DATA_PROPERTIES)
      : INITIAL_ARTICLE_FORM_DATA;
    const replacedBannerImageId = this.form.controls.bannerImageId.value;

    this.restore.emit(originalArticle?.id ?? null);
    this.form.reset(restored);

    if (restored.bannerImageId && restored.bannerImageId !== replacedBannerImageId) {
      this.requestFetchMainImage.emit(restored.bannerImageId);
    }
  }

  public async onSelectBannerImage(): Promise<void> {
    const dialogResponse =
      await this.dialogService.open<Id>(ImageExplorerComponent).result;

    if (dialogResponse !== undefined) {
      const imageId = dialogResponse.split('-')[0];
      this.form.patchValue({ bannerImageId: imageId });
      this.requestFetchMainImage.emit(imageId);
    }
  }

  public onRevertBannerImage(): void {
    this.form.patchValue({ bannerImageId: this.originalArticle()?.bannerImageId ?? '' });
  }

  public async onInsertImage(): Promise<void> {
    const dialogResponse =
      await this.dialogService.open<Id>(ImageExplorerComponent).result;

    if (dialogResponse === undefined) {
      return;
    }

    const imageId = dialogResponse.split('-')[0];
    const imageTag = `{{{${imageId}}}}(((500)))<<<Image caption goes here>>>`;

    this.bodyField().insertText(`\n\n${imageTag}\n\n`);
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

    const originalArticle = this.originalArticle();
    const dialog: Dialog = {
      title: 'Confirm',
      body: originalArticle
        ? `Update ${originalArticle.title} article?`
        : `Publish ${this.form.controls.title.value} to News page?`,
      confirmButtonText: originalArticle ? 'Update' : 'Publish',
      confirmAction: () => this.save(),
    };

    await this.dialogService.open(BasicDialogComponent, { inputs: { dialog } }).result;
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

  private buildForm(data: ArticleFormData): FormGroup<ArticleFormGroup> {
    return new FormGroup<ArticleFormGroup>({
      bannerImageId: new FormControl(data.bannerImageId, {
        nonNullable: true,
        validators: [Validators.required, textValidator],
      }),
      title: new FormControl(data.title, {
        nonNullable: true,
        validators: [Validators.required, textValidator],
      }),
      body: new FormControl(data.body, {
        nonNullable: true,
        validators: [Validators.required, textValidator],
      }),
    });
  }

  private expandBodyImageTags(bodyImages: Image[]): void {
    let body = this.form.controls.body.value;

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

    replacements.forEach(({ oldString, newString }) => {
      body = body.replace(oldString, newString);
    });

    if (replacements.length > 0) {
      this.form.patchValue({ body }, { emitEvent: false });
    }
  }

  private emitChange(): void {
    this.change.emit({
      articleId: this.originalArticle()?.id ?? null,
      formData: this.form.getRawValue(),
    });
  }
}
