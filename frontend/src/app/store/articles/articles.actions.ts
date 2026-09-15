import { createAction, props } from '@ngrx/store';

import {
  Article,
  ArticleFormData,
  DataPaginationOptions,
  Id,
  LccError,
} from '@app/models';

export const fetchHomePageArticlesRequested = createAction(
  '[Articles] Fetch home page articles requested',
);
export const fetchHomePageArticlesInBackgroundRequested = createAction(
  '[Articles] Fetch home page articles in background requested',
);
export const fetchHomePageArticlesSucceeded = createAction(
  '[Articles] Fetch home page articles succeeded',
  props<{ articles: Article[]; totalCount: number }>(),
);
export const fetchHomePageArticlesFailed = createAction(
  '[Articles] Fetch home page articles failed',
  props<{ error: LccError }>(),
);

export const fetchFilteredArticlesRequested = createAction(
  '[Articles] Fetch filtered articles requested',
);
export const fetchFilteredArticlesInBackgroundRequested = createAction(
  '[Articles] Fetch filtered articles in background requested',
);
export const fetchFilteredArticlesSucceeded = createAction(
  '[Articles] Fetch filtered articles succeeded',
  props<{ articles: Article[]; filteredCount: number; totalCount: number }>(),
);
export const fetchFilteredArticlesFailed = createAction(
  '[Articles] Fetch filtered articles failed',
  props<{ error: LccError }>(),
);

export const fetchArticleRequested = createAction(
  '[Articles] Fetch article requested',
  props<{ articleId: Id }>(),
);
export const fetchArticleSucceeded = createAction(
  '[Articles] Fetch article succeeded',
  props<{ article: Article }>(),
);
export const fetchArticleFailed = createAction(
  '[Articles] Fetch article failed',
  props<{ error: LccError }>(),
);

export const createAnArticleSelected = createAction(
  '[Articles] Create an article selected',
);

export const publishArticleRequested = createAction(
  '[Articles] Publish article requested',
);
export const publishArticleSucceeded = createAction(
  '[Articles] Publish article succeeded',
  props<{ article: Article }>(),
);
export const publishArticleFailed = createAction(
  '[Articles] Publish article failed',
  props<{ error: LccError }>(),
);

export const updateArticleBookmarkRequested = createAction(
  '[Articles] Update article bookmark requested',
  props<{ articleId: Id; bookmark: boolean }>(),
);
export const updateArticleRequested = createAction(
  '[Articles] Update article requested',
  props<{ articleId: Id }>(),
);
export const updateArticleSucceeded = createAction(
  '[Articles] Update article succeeded',
  props<{ article: Article; originalArticleTitle: string }>(),
);
export const updateArticleFailed = createAction(
  '[Articles] Update article failed',
  props<{ error: LccError }>(),
);

export const deleteArticleRequested = createAction(
  '[Articles] Delete article requested',
  props<{ article: Article }>(),
);
export const deleteArticleSucceeded = createAction(
  '[Articles] Delete article succeeded',
  props<{ articleId: Id; articleTitle: string }>(),
);
export const deleteArticleFailed = createAction(
  '[Articles] Delete article failed',
  props<{ error: LccError }>(),
);

export const paginationOptionsChanged = createAction(
  '[Articles] Pagination options changed',
  props<{ options: DataPaginationOptions<Article>; fetch: boolean }>(),
);

export const cancelSelected = createAction('[Articles] Cancel selected');

export const formDataChanged = createAction(
  '[Articles] Form data changed',
  props<{ articleId: Id | null; formData: Partial<ArticleFormData> }>(),
);

export const formDataRestored = createAction(
  '[Articles] Form data restored',
  props<{ articleId: Id | null }>(),
);

export const requestTimedOut = createAction('[Articles] Request timed out');
