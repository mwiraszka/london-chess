import { createFeatureSelector, createSelector } from '@ngrx/store';
import { pick } from 'lodash';

import { INITIAL_ARTICLE_FORM_DATA } from '@app/constants';
import { Id } from '@app/models';
import { areSame } from '@app/utils';

import { ArticlesState, articlesAdapter } from './articles.reducer';

const selectArticlesState = createFeatureSelector<ArticlesState>('articlesState');

export const selectCallState = createSelector(
  selectArticlesState,
  state => state.callState,
);

export const selectLastHomePageFetch = createSelector(
  selectArticlesState,
  state => state.lastHomePageFetch,
);

export const selectLastFilteredFetch = createSelector(
  selectArticlesState,
  state => state.lastFilteredFetch,
);

export const selectHomePageArticles = createSelector(
  selectArticlesState,
  state => state.homePageArticles,
);

export const selectFilteredArticles = createSelector(
  selectArticlesState,
  state => state.filteredArticles,
);

export const selectOptions = createSelector(selectArticlesState, state => state.options);

export const selectFilteredCount = createSelector(
  selectArticlesState,
  state => state.filteredCount,
);

export const selectTotalCount = createSelector(
  selectArticlesState,
  state => state.totalCount,
);

const { selectAll: selectAllArticleEntities } =
  articlesAdapter.getSelectors(selectArticlesState);

export const selectAllArticles = createSelector(
  selectAllArticleEntities,
  allArticleEntities => allArticleEntities.map(entity => entity?.article),
);

export const selectArticleById = (id: Id | null) =>
  createSelector(
    selectAllArticles,
    allArticles => allArticles.find(article => article.id === id) ?? null,
  );

export const selectArticleFormDataById = (id: Id | null) =>
  createSelector(
    selectArticlesState,
    selectAllArticleEntities,
    (state, allArticleEntities) =>
      allArticleEntities.find(entity => entity.article.id === id)?.formData ??
      state.newArticleFormData,
  );

export const selectHasUnsavedChanges = (id: Id | null) =>
  createSelector(
    selectArticleById(id),
    selectArticleFormDataById(id),
    (article, articleFormData) => {
      const formPropertiesOfOriginalArticle = pick(
        article ?? INITIAL_ARTICLE_FORM_DATA,
        Object.getOwnPropertyNames(articleFormData),
      );

      return !areSame(formPropertiesOfOriginalArticle, articleFormData);
    },
  );
