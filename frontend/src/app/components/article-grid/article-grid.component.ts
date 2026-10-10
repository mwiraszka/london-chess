import {
  BookmarkIconComponent,
  DialogService,
  DividerComponent,
  SkeletonComponent,
} from '@eagami/ui';

import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';

import { BasicDialogComponent } from '@app/components/basic-dialog/basic-dialog.component';
import { ImageComponent } from '@app/components/image/image.component';
import { PAGE_SIZES } from '@app/constants/filters';
import { AdminControlsDirective } from '@app/directives/admin-controls.directive';
import {
  AdminControlsConfig,
  Article,
  DataPaginationOptions,
  Dialog,
  Id,
  Image,
} from '@app/models';
import {
  FormatDatePipe,
  HighlightPipe,
  RouterLinkPipe,
  SummarizeArticlePipe,
} from '@app/pipes';
import { DeletionService, StoreRequestService } from '@app/services';
import { ArticlesActions } from '@app/store/articles';
import { isDefined, pageOf, pageRowCount } from '@app/utils';

interface ArticleRow {
  article: Article;
  bannerImage: Image | null;
}

@Component({
  selector: 'lcc-article-grid',
  templateUrl: './article-grid.component.html',
  styleUrl: './article-grid.component.scss',
  host: { '[class.is-home-page]': '!!isHomePage()' },
  imports: [
    AdminControlsDirective,
    BookmarkIconComponent,
    DividerComponent,
    FormatDatePipe,
    HighlightPipe,
    ImageComponent,
    RouterLink,
    RouterLinkPipe,
    SkeletonComponent,
    SummarizeArticlePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArticleGridComponent {
  private readonly deletion = inject(DeletionService);
  private readonly dialogService = inject(DialogService);
  private readonly storeRequests = inject(StoreRequestService);

  readonly articles = input.required<Article[]>();
  readonly images = input.required<Image[]>();
  readonly isAdmin = input.required<boolean>();

  readonly filteredCount = input<number | null>(null);
  readonly isHomePage = input<boolean>();
  readonly isLoading = input(false);
  readonly options = input<DataPaginationOptions<Article>>();

  // Whether the first load has come in, after which the cards no longer fade in
  private readonly settled = signal(false);

  private readonly skeletonRow: ArticleRow = {
    article: {} as Article,
    bannerImage: null,
  };

  public readonly entering = computed(() => this.isLoading() && !this.settled());

  // As many placeholders as the page will hold, as far as is known before it loads
  private readonly skeletonCount = computed(() => {
    if (this.isHomePage()) {
      return 10;
    }
    const options = this.options();
    if (!options) {
      return 100;
    }
    return pageRowCount(options.pageSize, this.filteredCount() ?? PAGE_SIZES[0]);
  });

  public readonly visibleRows = computed<ArticleRow[]>(() => {
    const options = this.options();
    const sliced = options
      ? pageOf(this.articles(), 1, options.pageSize)
      : this.articles();

    const imagesById = new Map<Id, Image>();
    this.images().forEach(image => imagesById.set(image.id, image));

    return sliced.map(article => ({
      article,
      bannerImage: imagesById.get(article.bannerImageId) ?? null,
    }));
  });

  public readonly displayItems = computed<ArticleRow[]>(() =>
    this.isLoading()
      ? Array.from({ length: this.skeletonCount() }, () => this.skeletonRow)
      : this.visibleRows(),
  );

  constructor() {
    let wasLoading = false;
    effect(() => {
      const isLoading = this.isLoading();
      if (wasLoading && !isLoading) {
        this.settled.set(true);
      }
      wasLoading = isLoading;
    });
  }

  public getAdminControlsConfig(article: Article): AdminControlsConfig {
    return {
      bookmarkCb: () => this.onBookmarkArticle(article),
      bookmarked: isDefined(article.bookmarkDate),
      buttonSize: 34,
      deleteCb: () => this.deletion.deleteArticle(article),
      editPath: ['article', 'edit', article.id],
      itemName: article.title,
    };
  }

  public async onBookmarkArticle(article: Article): Promise<void> {
    const hasBookmark = isDefined(article.bookmarkDate);
    const dialog: Dialog = {
      title: 'Confirm',
      body: hasBookmark
        ? `Remove bookmark from article ${article.title}?`
        : `Bookmark ${article.title}? This will make the article show up first in the list of articles.`,
      confirmButtonText: hasBookmark ? 'Remove' : 'Bookmark',
      confirmButtonType: 'primary',
      confirmAction: () =>
        this.storeRequests.dispatch(
          ArticlesActions.updateArticleBookmarkRequested({
            articleId: article.id,
            bookmark: !hasBookmark,
          }),
          [ArticlesActions.updateArticleSucceeded, ArticlesActions.updateArticleFailed],
        ),
    };

    await this.dialogService.open(BasicDialogComponent, { inputs: { dialog } }).result;
  }
}
