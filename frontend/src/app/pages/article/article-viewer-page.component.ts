import { MapIconComponent } from '@eagami/ui';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { Store } from '@ngrx/store';
import { isEqual } from 'lodash';
import { Observable, combineLatest } from 'rxjs';
import { distinctUntilChanged, map, switchMap, tap } from 'rxjs/operators';

import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { ArticleSkeletonComponent } from '@app/components/article-skeleton/article-skeleton.component';
import { ArticleComponent } from '@app/components/article/article.component';
import { BasicDialogComponent } from '@app/components/basic-dialog/basic-dialog.component';
import { LinkListComponent } from '@app/components/link-list/link-list.component';
import { AdminControlsDirective } from '@app/directives/admin-controls.directive';
import {
  AdminControlsConfig,
  Article,
  BasicDialogResult,
  Dialog,
  Id,
  Image,
  InternalLink,
} from '@app/models';
import { DialogService, MetaAndTitleService } from '@app/services';
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
          [bodyImages]="vm.bodyImages"
          [isWideView]="vm.isWideView">
        </lcc-article>
        <lcc-link-list [links]="[newsPageLink]"></lcc-link-list>
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
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArticleViewerPageComponent implements OnInit {
  public readonly newsPageLink: InternalLink = {
    text: 'More articles',
    internalPath: 'news',
    icon: MapIconComponent,
  };
  public viewModel$?: Observable<{
    article: Article | null;
    bannerImage: Image | null;
    bodyImages: Image[];
    isAdmin: boolean;
    isWideView: boolean;
  }>;

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
          this.store.select(ImagesSelectors.selectBannerImageByArticleId(articleId)),
          this.store.select(ImagesSelectors.selectBodyImagesByArticleId(articleId)),
          this.store.select(AuthSelectors.selectIsAdmin),
          this.store.select(AppSelectors.selectIsWideView),
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
      map(([article, bannerImage, bodyImages, isAdmin, isWideView]) => ({
        article: article ?? null,
        bannerImage,
        bodyImages,
        isAdmin,
        isWideView,
      })),
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
    };

    const result = await this.dialogService.open<BasicDialogComponent, BasicDialogResult>(
      {
        componentType: BasicDialogComponent,
        isModal: true,
        inputs: { dialog },
      },
    );

    if (result === 'confirm') {
      this.store.dispatch(ArticlesActions.deleteArticleRequested({ article }));
    }
  }
}
