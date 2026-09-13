import { BookmarkIconComponent, SkeletonComponent } from '@eagami/ui';

import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
} from '@angular/core';
import { RouterLink } from '@angular/router';

import { BasicDialogComponent } from '@app/components/basic-dialog/basic-dialog.component';
import { ImageComponent } from '@app/components/image/image.component';
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
import { DialogService } from '@app/services';
import { isDefined } from '@app/utils';

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
    SkeletonComponent,
    AdminControlsDirective,
    FormatDatePipe,
    HighlightPipe,
    ImageComponent,
    BookmarkIconComponent,
    RouterLink,
    RouterLinkPipe,
    SummarizeArticlePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArticleGridComponent implements OnChanges {
  @Input({ required: true }) articles!: Article[];
  @Input({ required: true }) images!: Image[];
  @Input({ required: true }) isAdmin!: boolean;

  @Input() isHomePage?: boolean;
  @Input() isLoading?: boolean;
  @Input() options?: DataPaginationOptions<Article>;

  @Output() requestDeleteArticle = new EventEmitter<Article>();
  @Output() requestUpdateArticleBookmark = new EventEmitter<{
    articleId: Id;
    bookmark: boolean;
  }>();

  public visibleRows: ArticleRow[] = [];

  private readonly skeletonRow: ArticleRow = {
    article: {} as Article,
    bannerImage: null,
  };

  constructor(private readonly dialogService: DialogService) {}

  public get showSkeleton(): boolean {
    return !!this.isLoading;
  }

  public get displayItems(): ArticleRow[] {
    if (this.showSkeleton) {
      const count = this.isHomePage
        ? 10
        : this.options?.pageSize !== -1
          ? (this.options?.pageSize ?? 100)
          : 100;
      return Array.from({ length: count }, () => this.skeletonRow);
    }
    return this.visibleRows;
  }

  public ngOnChanges(changes: SimpleChanges<ArticleGridComponent>): void {
    if (changes.articles || changes.images || changes.options) {
      this.visibleRows = this.buildVisibleRows();
    }
  }

  private buildVisibleRows(): ArticleRow[] {
    const sliced =
      !this.options || this.options.pageSize === -1
        ? this.articles
        : this.articles.slice(0, this.options.pageSize);

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
    };

    const result = await this.dialogService.open<BasicDialogComponent, BasicDialogResult>(
      {
        componentType: BasicDialogComponent,
        inputs: { dialog },
        isModal: true,
      },
    );

    if (result === 'confirm') {
      this.requestDeleteArticle.emit(article);
    }
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
    };

    const result = await this.dialogService.open<BasicDialogComponent, BasicDialogResult>(
      {
        componentType: BasicDialogComponent,
        inputs: { dialog },
        isModal: true,
      },
    );

    if (result === 'confirm') {
      this.requestUpdateArticleBookmark.emit({
        articleId: article.id!,
        bookmark: !hasBookmark,
      });
    }
  }
}
