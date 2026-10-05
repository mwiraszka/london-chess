import { NewspaperIconComponent } from '@eagami/ui';
import { Store } from '@ngrx/store';
import { isEqual } from 'lodash';
import { Observable, combineLatest, of } from 'rxjs';
import { distinctUntilChanged, map, switchMap, tap } from 'rxjs/operators';

import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { ArticleSkeletonComponent } from '@app/components/article-skeleton/article-skeleton.component';
import { ArticleComponent } from '@app/components/article/article.component';
import { LinkListComponent } from '@app/components/link-list/link-list.component';
import { LoadFailedComponent } from '@app/components/load-failed/load-failed.component';
import { AdminControlsDirective } from '@app/directives/admin-controls.directive';
import {
  AdminControlsConfig,
  Article,
  Id,
  Image,
  InternalLink,
  LoadStatus,
} from '@app/models';
import { DeletionService, MetaAndTitleService } from '@app/services';
import { ArticlesActions, ArticlesSelectors } from '@app/store/articles';
import { AuthSelectors } from '@app/store/auth';
import { ImagesSelectors } from '@app/store/images';

@Component({
  selector: 'lcc-article-viewer-page',
  template: `
    @if (viewModel$ | async; as vm) {
      @if (vm.article; as article) {
        <lcc-article
          [adminControls]="vm.isAdmin ? getAdminControlsConfig(article) : null"
          [article]="article"
          [bannerImage]="vm.bannerImage"
          [bodyImages]="vm.bodyImages">
        </lcc-article>
        <lcc-link-list [links]="[newsPageLink]"></lcc-link-list>
      } @else if (vm.status === 'failed') {
        <lcc-load-failed
          title="Unable to load this article"
          (retry)="onRetry(vm.articleId)" />
      } @else {
        <lcc-article-skeleton />
      }
    }
  `,
  imports: [
    AdminControlsDirective,
    ArticleComponent,
    ArticleSkeletonComponent,
    CommonModule,
    LinkListComponent,
    LoadFailedComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'lcc-page--reading' },
})
export class ArticleViewerPageComponent implements OnInit {
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly deletion = inject(DeletionService);
  private readonly metaAndTitleService = inject(MetaAndTitleService);
  private readonly store = inject(Store);

  public readonly newsPageLink: InternalLink = {
    text: 'More articles',
    internalPath: 'news',
    icon: NewspaperIconComponent,
  };
  public viewModel$?: Observable<{
    article: Article | null;
    articleId: Id;
    bannerImage: Image | null;
    bodyImages: Image[];
    isAdmin: boolean;
    status: LoadStatus;
  }>;

  public ngOnInit(): void {
    this.viewModel$ = this.activatedRoute.params.pipe(
      map(params => params['article_id'] as Id),
      switchMap(articleId =>
        combineLatest([
          this.store.select(ArticlesSelectors.selectArticleById(articleId)),
          of(articleId),
          this.store.select(ImagesSelectors.selectBannerImageByArticleId(articleId)),
          this.store.select(ImagesSelectors.selectBodyImagesByArticleId(articleId)),
          this.store.select(AuthSelectors.selectIsAdmin),
          this.store.select(ArticlesSelectors.selectArticleStatus(articleId)),
        ]),
      ),
      distinctUntilChanged(isEqual),
      tap(([article]) => {
        if (!article) {
          return;
        }
        const articlePreview =
          article.body.length > 197 ? article.body.slice(0, 197) + '...' : article.body;
        this.metaAndTitleService.updateTitle(article.title);
        this.metaAndTitleService.updateDescription(articlePreview);
      }),
      map(([article, articleId, bannerImage, bodyImages, isAdmin, status]) => ({
        article: article ?? null,
        articleId,
        bannerImage,
        bodyImages,
        isAdmin,
        status,
      })),
    );
  }

  public getAdminControlsConfig(article: Article): AdminControlsConfig {
    return {
      buttonSize: 34,
      deleteCb: () => this.deletion.deleteArticle(article),
      editPath: ['article', 'edit', article.id!],
      itemName: article.title,
    };
  }

  public onRetry(articleId: Id): void {
    this.store.dispatch(ArticlesActions.fetchArticleRequested({ articleId }));
  }
}
