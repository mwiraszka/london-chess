import { EntityState, createEntityAdapter } from '@ngrx/entity';
import { createReducer, on } from '@ngrx/store';
import { pick } from 'lodash';

import { ARTICLE_FORM_DATA_PROPERTIES, INITIAL_ARTICLE_FORM_DATA } from '@app/constants';
import {
  Article,
  ArticleFormData,
  CallState,
  DataPaginationOptions,
  IsoDate,
} from '@app/models';
import { areSame } from '@app/utils';

import * as ArticlesActions from './articles.actions';

export interface ArticlesState extends EntityState<{
  article: Article;
  formData: ArticleFormData;
}> {
  callState: CallState;
  newArticleFormData: ArticleFormData;
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
  callState: {
    status: 'idle',
    loadStart: null,
    error: null,
  },
  newArticleFormData: INITIAL_ARTICLE_FORM_DATA,
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

export const articlesReducer = createReducer(
  initialState,

  on(
    ArticlesActions.fetchHomePageArticlesRequested,
    ArticlesActions.fetchFilteredArticlesRequested,
    ArticlesActions.fetchArticleRequested,
    ArticlesActions.publishArticleRequested,
    ArticlesActions.updateArticleRequested,
    ArticlesActions.updateArticleBookmarkRequested,
    ArticlesActions.deleteArticleRequested,
    (state): ArticlesState => ({
      ...state,
      callState: {
        status: 'loading',
        loadStart: new Date().toISOString(),
        error: null,
      },
    }),
  ),

  on(
    ArticlesActions.fetchHomePageArticlesInBackgroundRequested,
    ArticlesActions.fetchFilteredArticlesInBackgroundRequested,
    (state): ArticlesState => ({
      ...state,
      callState: {
        status: 'background-loading',
        loadStart: new Date().toISOString(),
        error: null,
      },
    }),
  ),

  on(
    ArticlesActions.fetchHomePageArticlesFailed,
    ArticlesActions.fetchFilteredArticlesFailed,
    ArticlesActions.fetchArticleFailed,
    ArticlesActions.publishArticleFailed,
    ArticlesActions.updateArticleFailed,
    ArticlesActions.deleteArticleFailed,
    (state, { error }): ArticlesState => ({
      ...state,
      callState: {
        status: 'error',
        loadStart: null,
        error,
      },
    }),
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
          callState: initialState.callState,
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
          callState: initialState.callState,
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
    lastFilteredFetch: null,
  })),

  on(ArticlesActions.fetchArticleSucceeded, (state, { article }): ArticlesState => {
    const previousFormData = state.entities[article.id]?.formData;
    return articlesAdapter.upsertOne(
      {
        article,
        formData: previousFormData ?? pick(article, ARTICLE_FORM_DATA_PROPERTIES),
      },
      {
        ...state,
        callState: initialState.callState,
      },
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
        callState: initialState.callState,
        newArticleFormData: INITIAL_ARTICLE_FORM_DATA,
        lastHomePageFetch: null,
        lastFilteredFetch: null,
      },
    ),
  ),

  on(ArticlesActions.updateArticleSucceeded, (state, { article }): ArticlesState => {
    return articlesAdapter.upsertOne(
      {
        article,
        formData: pick(article, ARTICLE_FORM_DATA_PROPERTIES),
      },
      {
        ...state,
        callState: initialState.callState,
        lastHomePageFetch: null,
        lastFilteredFetch: null,
      },
    );
  }),

  on(ArticlesActions.deleteArticleSucceeded, (state, { articleId }): ArticlesState =>
    articlesAdapter.removeOne(articleId, {
      ...state,
      callState: initialState.callState,
      lastHomePageFetch: null,
      lastFilteredFetch: null,
    }),
  ),

  on(ArticlesActions.requestTimedOut, (state): ArticlesState => ({
    ...state,
    callState: {
      status: 'error',
      loadStart: null,
      error: { name: 'LCCError', message: 'Request timed out' },
    },
  })),

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
