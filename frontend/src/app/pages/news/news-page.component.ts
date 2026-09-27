import {
  EmptyStateComponent,
  FilterXIconComponent,
  InputComponent,
  NewspaperIconComponent,
  PaginatorComponent,
  PaginatorState,
  PlusCircleIconComponent,
  SearchIconComponent,
} from '@eagami/ui';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { Store } from '@ngrx/store';
import { Observable, combineLatest } from 'rxjs';
import { debounceTime, distinctUntilChanged, map, withLatestFrom } from 'rxjs/operators';

import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

import { AdminToolbarComponent } from '@app/components/admin-toolbar/admin-toolbar.component';
import { ArticleGridComponent } from '@app/components/article-grid/article-grid.component';
import { LoadFailedComponent } from '@app/components/load-failed/load-failed.component';
import { PageHeaderComponent } from '@app/components/page-header/page-header.component';
import { PAGE_SIZES, SEARCH_DEBOUNCE } from '@app/constants/filters';
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

      <div class="filters">
        <ea-input
          class="filters__search"
          label="Search"
          placeholder="Search by author, title or content"
          [formControl]="searchControl"
          [icon]="searchIcon" />
      </div>

      @if (vm.status === 'failed') {
        <lcc-load-failed
          title="Unable to load articles"
          (retry)="onRetry()" />
      } @else if (
        vm.status !== 'loading' && !vm.isFetching && !vm.filteredArticles.length
      ) {
        <ea-empty-state
          description="No articles match your search."
          [icon]="emptyIcon" />
      } @else {
        <lcc-article-grid
          [articles]="vm.filteredArticles"
          [filteredCount]="vm.filteredCount"
          [images]="vm.images"
          [isAdmin]="vm.isAdmin"
          [isLoading]="vm.status === 'loading' || vm.isFetching"
          [options]="vm.options">
        </lcc-article-grid>
        <div class="paginator">
          <ea-paginator
            align="center"
            pageSizeLabel="articles"
            size="sm"
            [page]="vm.options.page"
            [pageSize]="vm.options.pageSize"
            [pageSizeOptions]="pageSizes"
            [showAllOption]="true"
            [showRangeLabel]="vm.filteredCount !== null"
            [totalItems]="vm.filteredCount ?? 0"
            (changed)="onPageChanged($event, vm.options)" />
        </div>
      }
    }
  `,
  styleUrl: './news-page.component.scss',
  imports: [
    AdminToolbarComponent,
    ArticleGridComponent,
    CommonModule,
    EmptyStateComponent,
    InputComponent,
    LoadFailedComponent,
    PageHeaderComponent,
    PaginatorComponent,
    ReactiveFormsModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NewsPageComponent implements OnInit {
  private readonly metaAndTitleService = inject(MetaAndTitleService);
  private readonly store = inject(Store);

  protected readonly pageIcon = NewspaperIconComponent;
  protected readonly emptyIcon = FilterXIconComponent;
  protected readonly searchIcon = SearchIconComponent;
  protected readonly searchControl = new FormControl('', { nonNullable: true });
  protected readonly pageSizes = PAGE_SIZES;

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
    isFetching: boolean;
    options: DataPaginationOptions<Article>;
    status: LoadStatus;
  }>;

  public ngOnInit(): void {
    this.metaAndTitleService.updateTitle('News');
    this.metaAndTitleService.updateDescription(
      'Read about a variety of topics related to the London Chess Club.',
    );

    // The box shows the search in force, wherever it was set, and sends new text on a pause
    this.store
      .select(ArticlesSelectors.selectOptions)
      .pipe(untilDestroyed(this))
      .subscribe(({ search }) => {
        if (this.searchControl.value !== search) {
          this.searchControl.setValue(search, { emitEvent: false });
        }
      });
    this.searchControl.valueChanges
      .pipe(
        debounceTime(SEARCH_DEBOUNCE),
        distinctUntilChanged(),
        withLatestFrom(this.store.select(ArticlesSelectors.selectOptions)),
        untilDestroyed(this),
      )
      .subscribe(([search, options]) =>
        this.onOptionsChange({ ...options, search, page: 1 }),
      );

    this.viewModel$ = combineLatest([
      this.store.select(ArticlesSelectors.selectFilteredArticles),
      this.store.select(ArticlesSelectors.selectFilteredCount),
      this.store.select(ImagesSelectors.selectAllImages),
      this.store.select(AuthSelectors.selectIsAdmin),
      this.store.select(ArticlesSelectors.selectIsFetchingFiltered),
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
          isFetching,
          options,
          articlesStatus,
          imagesStatus,
        ]) => ({
          filteredArticles,
          filteredCount,
          images,
          isAdmin,
          isFetching,
          options,
          status: combinedLoadStatus(articlesStatus, imagesStatus),
        }),
      ),
    );
  }

  public onOptionsChange(options: DataPaginationOptions<Article>, fetch = true): void {
    this.store.dispatch(ArticlesActions.paginationOptionsChanged({ options, fetch }));
  }

  public onPageChanged(
    { page, pageSize }: PaginatorState,
    options: DataPaginationOptions<Article>,
  ): void {
    this.onOptionsChange({ ...options, page, pageSize });
  }

  public onRetry(): void {
    this.store.dispatch(ArticlesActions.fetchFilteredArticlesRequested());
    this.store.dispatch(ImagesActions.fetchAllImagesMetadataRequested());
  }
}
