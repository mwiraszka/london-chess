import { createFeatureSelector, createSelector } from '@ngrx/store';
import { pick } from 'lodash';

import { INITIAL_ARTICLE_FORM_DATA } from '@app/constants';
import { Id } from '@app/models';
import { areSame, loadStatus } from '@app/utils';

import { ArticlesState, articlesAdapter } from './articles.reducer';

const selectArticlesState = createFeatureSelector<ArticlesState>('articlesState');

const selectFailedLoads = createSelector(selectArticlesState, state => state.failedLoads);

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

export const selectHomePageArticlesStatus = createSelector(
  selectLastHomePageFetch,
  selectFailedLoads,
  (lastFetch, failedLoads) =>
    loadStatus(lastFetch !== null, failedLoads.includes('homePage')),
);

export const selectFilteredArticlesStatus = createSelector(
  selectLastFilteredFetch,
  selectFailedLoads,
  (lastFetch, failedLoads) =>
    loadStatus(lastFetch !== null, failedLoads.includes('filtered')),
);

export const selectArticleStatus = (id: Id | null) =>
  createSelector(selectArticleById(id), selectFailedLoads, (article, failedLoads) =>
    loadStatus(!!article, failedLoads.includes('article')),
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

export const selectIsFetchingFiltered = createSelector(
  selectArticlesState,
  state => state.isFetchingFiltered,
);
