import { Actions, createEffect, ofType } from '@ngrx/effects';
import { concatLatestFrom } from '@ngrx/operators';
import { routerNavigatedAction } from '@ngrx/router-store';
import { Store } from '@ngrx/store';
import moment from 'moment-timezone';
import { combineLatest, merge, of, timer } from 'rxjs';
import {
  catchError,
  concatMap,
  filter,
  map,
  mergeMap,
  switchMap,
  take,
} from 'rxjs/operators';

import { Injectable, inject } from '@angular/core';

import { MAX_ARTICLE_BODY_IMAGES } from '@app/constants';
import { Article, DataPaginationOptions, LccError } from '@app/models';
import { ArticlesApiService, UserService } from '@app/services';
import * as AppActions from '@app/store/app/app.actions';
import * as AuthSelectors from '@app/store/auth/auth.selectors';
import * as NavSelectors from '@app/store/nav/nav.selectors';
import { IS_EXPIRED, PARSE_ERROR } from '@app/tokens';
import { isDefined } from '@app/utils';

import * as ArticlesActions from './articles.actions';
import * as ArticlesSelectors from './articles.selectors';

@Injectable()
export class ArticlesEffects {
  private readonly actions$ = inject(Actions);
  private readonly articlesApiService = inject(ArticlesApiService);
  private readonly store = inject(Store);

  private readonly isExpired = inject(IS_EXPIRED);
  private readonly parseError = inject(PARSE_ERROR);
  private readonly userService = inject(UserService);

  fetchHomePageArticles$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(ArticlesActions.fetchHomePageArticlesRequested),
      switchMap(() => {
        const options: DataPaginationOptions<Article> = {
          page: 1,
          pageSize: 10,
          sortBy: 'bookmarkDate',
          sortOrder: 'desc',
          filters: null,
          search: '',
        };

        return this.articlesApiService.getFilteredArticles(options).pipe(
          map(response =>
            ArticlesActions.fetchHomePageArticlesSucceeded({
              articles: response.data.items,
              totalCount: response.data.totalCount,
            }),
          ),
          catchError(error =>
            of(
              ArticlesActions.fetchHomePageArticlesFailed({
                error: this.parseError(error),
              }),
            ),
          ),
        );
      }),
    );
  });

  fetchFilteredArticles$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(ArticlesActions.fetchFilteredArticlesRequested),
      concatLatestFrom(() => this.store.select(ArticlesSelectors.selectOptions)),
      switchMap(([, options]) =>
        this.articlesApiService.getFilteredArticles(options).pipe(
          map(response =>
            ArticlesActions.fetchFilteredArticlesSucceeded({
              articles: response.data.items,
              filteredCount: response.data.filteredCount,
              totalCount: response.data.totalCount,
            }),
          ),
          catchError(error =>
            of(
              ArticlesActions.fetchFilteredArticlesFailed({
                error: this.parseError(error),
              }),
            ),
          ),
        ),
      ),
    );
  });

  refetchHomePageArticles$ = createEffect(() => {
    const refetchActions$ = this.actions$.pipe(
      ofType(
        AppActions.refreshAppRequested,
        ArticlesActions.publishArticleSucceeded,
        ArticlesActions.updateArticleSucceeded,
        ArticlesActions.deleteArticleSucceeded,
      ),
    );

    const periodicCheck$ = timer(0, 10 * 60 * 1000).pipe(
      switchMap(() =>
        this.store.select(ArticlesSelectors.selectLastHomePageFetch).pipe(take(1)),
      ),
      filter(lastFetch => this.isExpired(lastFetch)),
    );

    return merge(refetchActions$, periodicCheck$).pipe(
      map(() => ArticlesActions.fetchHomePageArticlesRequested()),
    );
  });

  refetchFilteredArticles$ = createEffect(() => {
    const refetchActions$ = merge(
      this.actions$.pipe(
        ofType(
          AppActions.refreshAppRequested,
          ArticlesActions.publishArticleSucceeded,
          ArticlesActions.updateArticleSucceeded,
          ArticlesActions.deleteArticleSucceeded,
        ),
      ),
      this.actions$.pipe(
        ofType(ArticlesActions.paginationOptionsChanged),
        filter(({ fetch }) => fetch),
      ),
    );

    const timerCheck$ = timer(0, 10 * 60 * 1000).pipe(
      switchMap(() =>
        combineLatest([
          this.store.select(ArticlesSelectors.selectLastFilteredFetch),
          this.store.select(NavSelectors.selectCurrentPath),
        ]).pipe(take(1)),
      ),
      filter(
        ([lastFetch, currentPath]) =>
          this.isExpired(lastFetch) &&
          !!(currentPath?.includes('/news') || currentPath?.includes('/article')),
      ),
    );

    const routerCheck$ = this.actions$.pipe(
      ofType(routerNavigatedAction),
      filter(({ payload }) => {
        const url = payload.event.url;
        return url.includes('/news') || url.includes('/article');
      }),
      switchMap(() =>
        this.store.select(ArticlesSelectors.selectLastFilteredFetch).pipe(take(1)),
      ),
      filter(lastFetch => this.isExpired(lastFetch)),
    );

    const periodicCheck$ = merge(timerCheck$, routerCheck$);

    return merge(refetchActions$, periodicCheck$).pipe(
      map(() => ArticlesActions.fetchFilteredArticlesRequested()),
    );
  });

  fetchArticle$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(ArticlesActions.fetchArticleRequested),
      switchMap(({ articleId }) =>
        this.articlesApiService.getArticle(articleId).pipe(
          map(response =>
            ArticlesActions.fetchArticleSucceeded({ article: response.data }),
          ),
          catchError(error =>
            of(ArticlesActions.fetchArticleFailed({ error: this.parseError(error) })),
          ),
        ),
      ),
    );
  });

  publishArticle$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(ArticlesActions.publishArticleRequested),
      concatLatestFrom(() => [
        this.store.select(ArticlesSelectors.selectArticleFormDataById(null)),
        this.store.select(AuthSelectors.selectUser).pipe(filter(isDefined)),
      ]),
      concatMap(([, formData, user]) => {
        // Validate body image count
        const imagePattern = /{{{([^}]+)}}}/g;
        const matches = formData.body?.match(imagePattern);
        const imageCount = matches ? matches.length : 0;

        if (imageCount > MAX_ARTICLE_BODY_IMAGES) {
          const error: LccError = {
            name: 'LCCError',
            message: `Articles can contain a maximum of ${MAX_ARTICLE_BODY_IMAGES} body images. Please remove ${imageCount - MAX_ARTICLE_BODY_IMAGES} image(s).`,
          };
          return of(ArticlesActions.publishArticleFailed({ error }));
        }

        const article: Article = {
          ...formData,
          id: '',
          bookmarkDate: null,
          modificationInfo: {
            createdBy: `${user.firstName} ${user.lastName}`,
            createdByNumber: this.userService.memberNumber(),
            dateCreated: moment().toISOString(),
            lastEditedBy: `${user.firstName} ${user.lastName}`,
            lastEditedByNumber: this.userService.memberNumber(),
            dateLastEdited: moment().toISOString(),
          },
        };

        return this.articlesApiService.addArticle(article).pipe(
          map(response =>
            ArticlesActions.publishArticleSucceeded({
              article: { ...article, id: response.data },
            }),
          ),
          catchError(error =>
            of(ArticlesActions.publishArticleFailed({ error: this.parseError(error) })),
          ),
        );
      }),
    );
  });

  updateArticle$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(ArticlesActions.updateArticleRequested),
      concatLatestFrom(({ articleId }) => [
        this.store
          .select(ArticlesSelectors.selectArticleById(articleId))
          .pipe(filter(isDefined)),
        this.store.select(ArticlesSelectors.selectArticleFormDataById(articleId)),
        this.store.select(AuthSelectors.selectUser).pipe(filter(isDefined)),
      ]),
      concatMap(([, article, formData, user]) => {
        // Validate body image count
        const imagePattern = /{{{([^}]+)}}}/g;
        const matches = formData.body?.match(imagePattern);
        const imageCount = matches ? matches.length : 0;

        if (imageCount > MAX_ARTICLE_BODY_IMAGES) {
          const error: LccError = {
            name: 'LCCError',
            message: `Articles can contain a maximum of ${MAX_ARTICLE_BODY_IMAGES} body images. Please remove ${imageCount - MAX_ARTICLE_BODY_IMAGES} image(s).`,
          };
          return of(ArticlesActions.updateArticleFailed({ error }));
        }

        const updatedArticle: Article = {
          ...article,
          ...formData,
          modificationInfo: {
            ...article.modificationInfo,
            lastEditedBy: `${user.firstName} ${user.lastName}`,
            lastEditedByNumber: this.userService.memberNumber(),
            dateLastEdited: moment().toISOString(),
          },
        };

        return this.articlesApiService.updateArticle(updatedArticle).pipe(
          map(() =>
            ArticlesActions.updateArticleSucceeded({
              article: updatedArticle,
              originalArticleTitle: article.title,
            }),
          ),
          catchError(error =>
            of(ArticlesActions.updateArticleFailed({ error: this.parseError(error) })),
          ),
        );
      }),
    );
  });

  updateArticleBookmarkRequested$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(ArticlesActions.updateArticleBookmarkRequested),
      concatLatestFrom(({ articleId }) =>
        this.store
          .select(ArticlesSelectors.selectArticleById(articleId))
          .pipe(filter(isDefined)),
      ),
      mergeMap(([{ bookmark }, article]) => {
        const updatedArticle: Article = {
          ...article,
          bookmarkDate: bookmark ? moment().toISOString() : null,
        };
        return this.articlesApiService.updateArticle(updatedArticle).pipe(
          map(() =>
            ArticlesActions.updateArticleSucceeded({
              article: updatedArticle,
              originalArticleTitle: article.title,
            }),
          ),
          catchError(error =>
            of(ArticlesActions.updateArticleFailed({ error: this.parseError(error) })),
          ),
        );
      }),
    );
  });

  deleteArticle$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(ArticlesActions.deleteArticleRequested),
      mergeMap(({ article }) =>
        this.articlesApiService.deleteArticle(article.id).pipe(
          map(() =>
            ArticlesActions.deleteArticleSucceeded({
              articleId: article.id,
              articleTitle: article.title,
            }),
          ),
          catchError(error =>
            of(ArticlesActions.deleteArticleFailed({ error: this.parseError(error) })),
          ),
        ),
      ),
    );
  });
}
