import { MapIconComponent, PlusCircleIconComponent } from '@eagami/ui';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { Store } from '@ngrx/store';
import { Observable, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';

import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';

import { AdminToolbarComponent } from '@app/components/admin-toolbar/admin-toolbar.component';
import { ArticleGridComponent } from '@app/components/article-grid/article-grid.component';
import { DataToolbarComponent } from '@app/components/data-toolbar/data-toolbar.component';
import { PageHeaderComponent } from '@app/components/page-header/page-header.component';
import { Article, DataPaginationOptions, Id, Image, InternalLink } from '@app/models';
import { MetaAndTitleService } from '@app/services';
import { ArticlesActions, ArticlesSelectors } from '@app/store/articles';
import { AuthSelectors } from '@app/store/auth';
import { ImagesSelectors } from '@app/store/images';

@UntilDestroy()
@Component({
  selector: 'lcc-news-page',
  template: `
    @if (viewModel$ | async; as vm) {
      <lcc-page-header
        heading="News"
        [icon]="pageIcon">
      </lcc-page-header>

      @if (vm.isAdmin) {
        <lcc-admin-toolbar [adminLinks]="[createArticleLink]"></lcc-admin-toolbar>
      }

      <lcc-data-toolbar
        entity="article"
        [filteredCount]="vm.filteredCount"
        [options]="vm.options"
        searchPlaceholder="Search by author, title or content"
        (optionsChange)="onOptionsChange($event)"
        (optionsChangeNoFetch)="onOptionsChange($event, false)">
      </lcc-data-toolbar>

      <lcc-article-grid
        [articles]="vm.filteredArticles"
        [images]="vm.images"
        [isAdmin]="vm.isAdmin"
        [isLoading]="vm.isLoading"
        [options]="vm.options"
        (requestDeleteArticle)="onRequestDeleteArticle($event)"
        (requestUpdateArticleBookmark)="onRequestUpdateArticleBookmark($event)">
      </lcc-article-grid>
    }
  `,
  imports: [
    AdminToolbarComponent,
    ArticleGridComponent,
    CommonModule,
    DataToolbarComponent,
    PageHeaderComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NewsPageComponent implements OnInit {
  protected readonly pageIcon = MapIconComponent;

  public createArticleLink: InternalLink = {
    internalPath: ['article', 'add'],
    text: 'Create an article',
    icon: PlusCircleIconComponent,
  };

  public viewModel$?: Observable<{
    filteredArticles: Article[];
    filteredCount: number | null;
    images: Image[];
    isAdmin: boolean;
    isLoading: boolean;
    options: DataPaginationOptions<Article>;
  }>;

  constructor(
    private readonly metaAndTitleService: MetaAndTitleService,
    private readonly store: Store,
  ) {}

  public ngOnInit(): void {
    this.metaAndTitleService.updateTitle('News');
    this.metaAndTitleService.updateDescription(
      'Read about a variety of topics related to the London Chess Club.',
    );

    this.viewModel$ = combineLatest([
      this.store.select(ArticlesSelectors.selectFilteredArticles),
      this.store.select(ArticlesSelectors.selectFilteredCount),
      this.store.select(ImagesSelectors.selectAllImages),
      this.store.select(AuthSelectors.selectIsAdmin),
      this.store.select(ArticlesSelectors.selectOptions),
      this.store.select(ArticlesSelectors.selectLastFilteredFetch),
      this.store.select(ImagesSelectors.selectLastMetadataFetch),
    ]).pipe(
      untilDestroyed(this),
      map(
        ([
          filteredArticles,
          filteredCount,
          images,
          isAdmin,
          options,
          lastArticlesFetch,
          lastImagesFetch,
        ]) => ({
          filteredArticles,
          filteredCount,
          images,
          isAdmin,
          isLoading: lastArticlesFetch === null || lastImagesFetch === null,
          options,
        }),
      ),
    );
  }

  public onOptionsChange(options: DataPaginationOptions<Article>, fetch = true): void {
    this.store.dispatch(ArticlesActions.paginationOptionsChanged({ options, fetch }));
  }

  public onRequestDeleteArticle(article: Article): void {
    this.store.dispatch(ArticlesActions.deleteArticleRequested({ article }));
  }

  public onRequestUpdateArticleBookmark(event: {
    articleId: Id;
    bookmark: boolean;
  }): void {
    this.store.dispatch(ArticlesActions.updateArticleBookmarkRequested(event));
  }
}
