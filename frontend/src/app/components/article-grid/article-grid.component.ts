import { BookmarkIconComponent, SkeletonComponent } from '@eagami/ui';

import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnChanges,
  SimpleChanges,
  inject,
} from '@angular/core';
import { RouterLink } from '@angular/router';

import { BasicDialogComponent } from '@app/components/basic-dialog/basic-dialog.component';
import { ImageComponent } from '@app/components/image/image.component';
import { PAGE_SIZES } from '@app/constants/filters';
import { AdminControlsDirective } from '@app/directives/admin-controls.directive';
import {
  AdminControlsConfig,
  Article,
  BasicDialogResult,
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
import { DialogService, StoreRequestService } from '@app/services';
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
  host: { '[class.is-home-page]': '!!isHomePage' },
  imports: [
    AdminControlsDirective,
    BookmarkIconComponent,
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
export class ArticleGridComponent implements OnChanges {
  @Input({ required: true }) articles!: Article[];
  @Input({ required: true }) images!: Image[];
  @Input({ required: true }) isAdmin!: boolean;

  @Input() filteredCount: number | null = null;
  @Input() isHomePage?: boolean;
  @Input() isLoading?: boolean;
  @Input() options?: DataPaginationOptions<Article>;

  public visibleRows: ArticleRow[] = [];

  // Whether the first load has come in, after which the cards no longer fade in
  private settled = false;

  private readonly skeletonRow: ArticleRow = {
    article: {} as Article,
    bannerImage: null,
  };

  private readonly storeRequests = inject(StoreRequestService);

  constructor(private readonly dialogService: DialogService) {}

  public get showSkeleton(): boolean {
    return !!this.isLoading;
  }

  public get entering(): boolean {
    return this.showSkeleton && !this.settled;
  }

  public get displayItems(): ArticleRow[] {
    if (this.showSkeleton) {
      return Array.from({ length: this.skeletonCount }, () => this.skeletonRow);
    }
    return this.visibleRows;
  }

  public ngOnChanges(changes: SimpleChanges<ArticleGridComponent>): void {
    if (changes.isLoading?.previousValue && !this.isLoading) {
      this.settled = true;
    }
    if (changes.articles || changes.images || changes.options) {
      this.visibleRows = this.buildVisibleRows();
    }
  }

  // As many placeholders as the page will hold, as far as is known before it loads
  private get skeletonCount(): number {
    if (this.isHomePage) {
      return 10;
    }
    if (!this.options) {
      return 100;
    }
    return pageRowCount(this.options.pageSize, this.filteredCount ?? PAGE_SIZES[0]);
  }

  private buildVisibleRows(): ArticleRow[] {
    const sliced = this.options
      ? pageOf(this.articles, 1, this.options.pageSize)
      : this.articles;

    const imagesById = new Map<Id, Image>();
    this.images.forEach(image => imagesById.set(image.id, image));

    return sliced.map(article => ({
      article,
      bannerImage: imagesById.get(article.bannerImageId) ?? null,
    }));
  }

  public getAdminControlsConfig(article: Article): AdminControlsConfig {
    return {
      bookmarkCb: () => this.onBookmarkArticle(article),
      bookmarked: isDefined(article.bookmarkDate),
      buttonSize: 34,
      deleteCb: () => this.onDeleteArticle(article),
      editPath: ['article', 'edit', article.id],
      itemName: article.title,
    };
  }

  public async onDeleteArticle(article: Article): Promise<void> {
    const dialog: Dialog = {
      title: 'Confirm',
      body: `Delete ${article.title}?`,
      confirmButtonText: 'Delete',
      confirmButtonType: 'warning',
      confirmAction: () =>
        this.storeRequests.dispatch(ArticlesActions.deleteArticleRequested({ article }), [
          ArticlesActions.deleteArticleSucceeded,
          ArticlesActions.deleteArticleFailed,
        ]),
    };

    await this.dialogService.open<BasicDialogComponent, BasicDialogResult>({
      componentType: BasicDialogComponent,
      inputs: { dialog },
      isModal: true,
    });
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

    await this.dialogService.open<BasicDialogComponent, BasicDialogResult>({
      componentType: BasicDialogComponent,
      inputs: { dialog },
      isModal: true,
    });
  }
}
