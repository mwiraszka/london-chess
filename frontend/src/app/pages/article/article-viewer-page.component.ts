import { NewspaperIconComponent } from '@eagami/ui';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { Store } from '@ngrx/store';
import { isEqual } from 'lodash';
import { Observable, combineLatest, of } from 'rxjs';
import { distinctUntilChanged, map, switchMap, tap } from 'rxjs/operators';

import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { ArticleSkeletonComponent } from '@app/components/article-skeleton/article-skeleton.component';
import { ArticleComponent } from '@app/components/article/article.component';
import { BasicDialogComponent } from '@app/components/basic-dialog/basic-dialog.component';
import { LinkListComponent } from '@app/components/link-list/link-list.component';
import { LoadFailedComponent } from '@app/components/load-failed/load-failed.component';
import { AdminControlsDirective } from '@app/directives/admin-controls.directive';
import {
  AdminControlsConfig,
  Article,
  BasicDialogResult,
  Dialog,
  Id,
  Image,
  InternalLink,
  LoadStatus,
} from '@app/models';
import { DialogService, MetaAndTitleService, StoreRequestService } from '@app/services';
import { AppSelectors } from '@app/store/app';
import { ArticlesActions, ArticlesSelectors } from '@app/store/articles';
import { AuthSelectors } from '@app/store/auth';
import { ImagesSelectors } from '@app/store/images';

@UntilDestroy()
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
})
export class ArticleViewerPageComponent implements OnInit {
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
    isWideView: boolean;
    status: LoadStatus;
  }>;

  private readonly storeRequests = inject(StoreRequestService);

  constructor(
    private readonly activatedRoute: ActivatedRoute,
    private readonly dialogService: DialogService,
    private readonly metaAndTitleService: MetaAndTitleService,
    private readonly store: Store,
  ) {}

  public ngOnInit(): void {
    this.viewModel$ = this.activatedRoute.params.pipe(
      untilDestroyed(this),
      map(params => params['article_id'] as Id),
      switchMap(articleId =>
        combineLatest([
          this.store.select(ArticlesSelectors.selectArticleById(articleId)),
          of(articleId),
          this.store.select(ImagesSelectors.selectBannerImageByArticleId(articleId)),
          this.store.select(ImagesSelectors.selectBodyImagesByArticleId(articleId)),
          this.store.select(AuthSelectors.selectIsAdmin),
          this.store.select(AppSelectors.selectIsWideView),
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
      map(
        ([article, articleId, bannerImage, bodyImages, isAdmin, isWideView, status]) => ({
          article: article ?? null,
          articleId,
          bannerImage,
          bodyImages,
          isAdmin,
          isWideView,
          status,
        }),
      ),
    );
  }

  public getAdminControlsConfig(article: Article): AdminControlsConfig {
    return {
      buttonSize: 34,
      deleteCb: () => this.onDelete(article),
      editPath: ['article', 'edit', article.id!],
      itemName: article.title,
    };
  }

  private async onDelete(article: Article): Promise<void> {
    const dialog: Dialog = {
      title: 'Confirm',
      body: `Update ${article.title}?`,
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
      isModal: true,
      inputs: { dialog },
    });
  }

  public onRetry(articleId: Id): void {
    this.store.dispatch(ArticlesActions.fetchArticleRequested({ articleId }));
  }
}
