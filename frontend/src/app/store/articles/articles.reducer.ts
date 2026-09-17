import { EntityState, createEntityAdapter } from '@ngrx/entity';
import { createReducer, on } from '@ngrx/store';
import { pick } from 'lodash';

import { ARTICLE_FORM_DATA_PROPERTIES, INITIAL_ARTICLE_FORM_DATA } from '@app/constants';
import { Article, ArticleFormData, DataPaginationOptions, IsoDate } from '@app/models';
import { areSame } from '@app/utils';

import * as ArticlesActions from './articles.actions';

export type ArticlesLoad = 'homePage' | 'filtered' | 'article';

export interface ArticlesState extends EntityState<{
  article: Article;
  formData: ArticleFormData;
}> {
  newArticleFormData: ArticleFormData;
  // Loads whose latest attempt failed, which are never persisted
  failedLoads: ArticlesLoad[];
  lastHomePageFetch: IsoDate | null;
  lastFilteredFetch: IsoDate | null;
  homePageArticles: Article[];
  filteredArticles: Article[];
  options: DataPaginationOptions<Article>;
  filteredCount: number | null;
  totalCount: number;
}

export const articlesAdapter = createEntityAdapter<{
  article: Article;
  formData: ArticleFormData;
}>({
  selectId: ({ article }) => article.id,
});

export const initialState: ArticlesState = articlesAdapter.getInitialState({
  newArticleFormData: INITIAL_ARTICLE_FORM_DATA,
  failedLoads: [],
  lastHomePageFetch: null,
  lastFilteredFetch: null,
  homePageArticles: [],
  filteredArticles: [],
  options: {
    page: 1,
    pageSize: 10,
    sortBy: 'bookmarkDate',
    sortOrder: 'desc',
    filters: null,
    search: '',
  },
  filteredCount: null,
  totalCount: 0,
});

function withLoadAttempt(state: ArticlesState, load: ArticlesLoad): ArticlesState {
  return { ...state, failedLoads: state.failedLoads.filter(failed => failed !== load) };
}

function withFailedLoad(state: ArticlesState, load: ArticlesLoad): ArticlesState {
  return { ...state, failedLoads: [...withLoadAttempt(state, load).failedLoads, load] };
}

export const articlesReducer = createReducer(
  initialState,

  on(ArticlesActions.fetchHomePageArticlesRequested, (state): ArticlesState =>
    withLoadAttempt(state, 'homePage'),
  ),
  on(ArticlesActions.fetchHomePageArticlesFailed, (state): ArticlesState =>
    withFailedLoad(state, 'homePage'),
  ),

  on(ArticlesActions.fetchFilteredArticlesRequested, (state): ArticlesState =>
    withLoadAttempt(state, 'filtered'),
  ),
  on(ArticlesActions.fetchFilteredArticlesFailed, (state): ArticlesState =>
    withFailedLoad(state, 'filtered'),
  ),

  on(ArticlesActions.fetchArticleRequested, (state): ArticlesState =>
    withLoadAttempt(state, 'article'),
  ),
  on(ArticlesActions.fetchArticleFailed, (state): ArticlesState =>
    withFailedLoad(state, 'article'),
  ),

  on(
    ArticlesActions.fetchHomePageArticlesSucceeded,
    (state, { articles, totalCount }): ArticlesState =>
      articlesAdapter.upsertMany(
        articles.map(article => {
          const existingEntity = state.entities[article.id];
          const hasUnsavedChanges =
            existingEntity?.formData &&
            !areSame(
              existingEntity.formData,
              pick(article, ARTICLE_FORM_DATA_PROPERTIES),
            );

          return {
            article,
            // Preserve existing formData if there are unsaved changes
            formData: hasUnsavedChanges
              ? existingEntity.formData
              : pick(article, ARTICLE_FORM_DATA_PROPERTIES),
          };
        }),
        {
          ...state,
          homePageArticles: articles,
          lastHomePageFetch: new Date().toISOString(),
          totalCount,
        },
      ),
  ),

  on(
    ArticlesActions.fetchFilteredArticlesSucceeded,
    (state, { articles, filteredCount, totalCount }): ArticlesState =>
      articlesAdapter.upsertMany(
        articles.map(article => {
          const existingEntity = state.entities[article.id];
          const hasUnsavedChanges =
            existingEntity?.formData &&
            !areSame(
              existingEntity.formData,
              pick(article, ARTICLE_FORM_DATA_PROPERTIES),
            );

          return {
            article,
            // Preserve existing formData if there are unsaved changes
            formData: hasUnsavedChanges
              ? existingEntity.formData
              : pick(article, ARTICLE_FORM_DATA_PROPERTIES),
          };
        }),
        {
          ...state,
          filteredArticles: articles,
          lastFilteredFetch: new Date().toISOString(),
          filteredCount,
          totalCount,
        },
      ),
  ),

  on(ArticlesActions.paginationOptionsChanged, (state, { options }): ArticlesState => ({
    ...state,
    options,
  })),

  on(ArticlesActions.fetchArticleSucceeded, (state, { article }): ArticlesState => {
    const previousFormData = state.entities[article.id]?.formData;
    return articlesAdapter.upsertOne(
      {
        article,
        formData: previousFormData ?? pick(article, ARTICLE_FORM_DATA_PROPERTIES),
      },
      state,
    );
  }),

  on(ArticlesActions.publishArticleSucceeded, (state, { article }): ArticlesState =>
    articlesAdapter.upsertOne(
      {
        article,
        formData: pick(article, ARTICLE_FORM_DATA_PROPERTIES),
      },
      {
        ...state,
        newArticleFormData: INITIAL_ARTICLE_FORM_DATA,
      },
    ),
  ),

  on(ArticlesActions.updateArticleSucceeded, (state, { article }): ArticlesState =>
    articlesAdapter.upsertOne(
      {
        article,
        formData: pick(article, ARTICLE_FORM_DATA_PROPERTIES),
      },
      state,
    ),
  ),

  on(ArticlesActions.deleteArticleSucceeded, (state, { articleId }): ArticlesState =>
    articlesAdapter.removeOne(articleId, {
      ...state,
      homePageArticles: state.homePageArticles.filter(({ id }) => id !== articleId),
      filteredArticles: state.filteredArticles.filter(({ id }) => id !== articleId),
    }),
  ),

  on(ArticlesActions.formDataChanged, (state, { articleId, formData }): ArticlesState => {
    const originalArticle = articleId ? state.entities[articleId] : null;

    if (!originalArticle) {
      return {
        ...state,
        newArticleFormData: {
          ...state.newArticleFormData,
          ...formData,
        },
      };
    }

    return articlesAdapter.upsertOne(
      {
        ...originalArticle,
        formData: {
          ...(originalArticle?.formData ?? INITIAL_ARTICLE_FORM_DATA),
          ...formData,
        },
      },
      state,
    );
  }),

  on(ArticlesActions.formDataRestored, (state, { articleId }): ArticlesState => {
    const originalArticle = articleId ? state.entities[articleId]?.article : null;

    if (!originalArticle) {
      return {
        ...state,
        newArticleFormData: INITIAL_ARTICLE_FORM_DATA,
      };
    }

    return articlesAdapter.upsertOne(
      {
        article: originalArticle,
        formData: pick(originalArticle, ARTICLE_FORM_DATA_PROPERTIES),
      },
      state,
    );
  }),
);
