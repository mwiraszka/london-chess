import { NewspaperIconComponent, PlusCircleIconComponent } from '@eagami/ui';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { Store } from '@ngrx/store';
import { Observable, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';

import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';

import { AdminToolbarComponent } from '@app/components/admin-toolbar/admin-toolbar.component';
import { ArticleGridComponent } from '@app/components/article-grid/article-grid.component';
import { DataToolbarComponent } from '@app/components/data-toolbar/data-toolbar.component';
import { LoadFailedComponent } from '@app/components/load-failed/load-failed.component';
import { PageHeaderComponent } from '@app/components/page-header/page-header.component';
import {
  Article,
  DataPaginationOptions,
  Image,
  InternalLink,
  LoadStatus,
} from '@app/models';
import { MetaAndTitleService } from '@app/services';
import { ArticlesActions, ArticlesSelectors } from '@app/store/articles';
import { AuthSelectors } from '@app/store/auth';
import { ImagesActions, ImagesSelectors } from '@app/store/images';
import { combinedLoadStatus } from '@app/utils';

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

      @if (vm.status === 'failed') {
        <lcc-load-failed
          title="Unable to load articles"
          (retry)="onRetry()" />
      } @else {
        <lcc-article-grid
          [articles]="vm.filteredArticles"
          [images]="vm.images"
          [isAdmin]="vm.isAdmin"
          [isLoading]="vm.status === 'loading'"
          [options]="vm.options">
        </lcc-article-grid>
      }
    }
  `,
  imports: [
    AdminToolbarComponent,
    ArticleGridComponent,
    CommonModule,
    DataToolbarComponent,
    LoadFailedComponent,
    PageHeaderComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NewsPageComponent implements OnInit {
  protected readonly pageIcon = NewspaperIconComponent;

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
    options: DataPaginationOptions<Article>;
    status: LoadStatus;
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
      this.store.select(ArticlesSelectors.selectFilteredArticlesStatus),
      this.store.select(ImagesSelectors.selectMetadataStatus),
    ]).pipe(
      untilDestroyed(this),
      map(
        ([
          filteredArticles,
          filteredCount,
          images,
          isAdmin,
          options,
          articlesStatus,
          imagesStatus,
        ]) => ({
          filteredArticles,
          filteredCount,
          images,
          isAdmin,
          options,
          status: combinedLoadStatus(articlesStatus, imagesStatus),
        }),
      ),
    );
  }

  public onOptionsChange(options: DataPaginationOptions<Article>, fetch = true): void {
    this.store.dispatch(ArticlesActions.paginationOptionsChanged({ options, fetch }));
  }

  public onRetry(): void {
    this.store.dispatch(ArticlesActions.fetchFilteredArticlesRequested());
    this.store.dispatch(ImagesActions.fetchAllImagesMetadataRequested());
  }
}
