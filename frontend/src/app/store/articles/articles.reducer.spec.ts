import { INITIAL_ARTICLE_FORM_DATA } from '@app/constants';
import { MOCK_ARTICLES } from '@app/mocks/articles.mock';
import { LccError } from '@app/models';

import * as ArticlesActions from './articles.actions';
import {
  ArticlesState,
  articlesAdapter,
  articlesReducer,
  initialState,
} from './articles.reducer';

describe('Articles Reducer', () => {
  const mockError: LccError = {
    name: 'LCCError',
    message: 'Something went wrong',
  };

  describe('unknown action', () => {
    it('should return the default state', () => {
      const action = { type: 'Unknown' };
      const state = articlesReducer(initialState, action);

      expect(state).toBe(initialState);
    });
  });

  describe('initialState', () => {
    it('should have the correct initial state', () => {
      expect(initialState).toEqual({
        ids: [],
        entities: {},
        callState: {
          status: 'idle',
          error: null,
          loadStart: null,
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
    });
  });

  describe('loading states', () => {
    it('should set loading state on fetchHomePageArticlesRequested', () => {
      const action = ArticlesActions.fetchHomePageArticlesRequested();
      const state = articlesReducer(initialState, action);

      expect(state.callState.status).toBe('loading');
      expect(state.callState.loadStart).toBeTruthy();
      expect(state.callState.error).toBeNull();
    });

    it('should set loading state on fetchFilteredArticlesRequested', () => {
      const action = ArticlesActions.fetchFilteredArticlesRequested();
      const state = articlesReducer(initialState, action);

      expect(state.callState.status).toBe('loading');
      expect(state.callState.loadStart).toBeTruthy();
    });

    it('should set loading state on fetchArticleRequested', () => {
      const action = ArticlesActions.fetchArticleRequested({
        articleId: MOCK_ARTICLES[0].id,
      });
      const state = articlesReducer(initialState, action);

      expect(state.callState.status).toBe('loading');
    });

    it('should set loading state on publishArticleRequested', () => {
      const action = ArticlesActions.publishArticleRequested();
      const state = articlesReducer(initialState, action);

      expect(state.callState.status).toBe('loading');
    });

    it('should set loading state on updateArticleRequested', () => {
      const action = ArticlesActions.updateArticleRequested({
        articleId: MOCK_ARTICLES[0].id,
      });
      const state = articlesReducer(initialState, action);

      expect(state.callState.status).toBe('loading');
    });

    it('should set loading state on updateArticleBookmarkRequested', () => {
      const action = ArticlesActions.updateArticleBookmarkRequested({
        articleId: MOCK_ARTICLES[0].id,
        bookmark: true,
      });
      const state = articlesReducer(initialState, action);

      expect(state.callState.status).toBe('loading');
    });

    it('should set loading state on deleteArticleRequested', () => {
      const action = ArticlesActions.deleteArticleRequested({
        article: MOCK_ARTICLES[0],
      });
      const state = articlesReducer(initialState, action);

      expect(state.callState.status).toBe('loading');
    });
  });

  describe('background loading states', () => {
    it('should set background-loading state on fetchHomePageArticlesInBackgroundRequested', () => {
      const action = ArticlesActions.fetchHomePageArticlesInBackgroundRequested();
      const state = articlesReducer(initialState, action);

      expect(state.callState.status).toBe('background-loading');
      expect(state.callState.loadStart).toBeTruthy();
    });

    it('should set background-loading state on fetchFilteredArticlesInBackgroundRequested', () => {
      const action = ArticlesActions.fetchFilteredArticlesInBackgroundRequested();
      const state = articlesReducer(initialState, action);

      expect(state.callState.status).toBe('background-loading');
    });
  });

  describe('error states', () => {
    it('should set error state on fetchHomePageArticlesFailed', () => {
      const action = ArticlesActions.fetchHomePageArticlesFailed({ error: mockError });
      const state = articlesReducer(initialState, action);

      expect(state.callState.status).toBe('error');
      expect(state.callState.error).toEqual(mockError);
      expect(state.callState.loadStart).toBeNull();
    });

    it('should set error state on fetchFilteredArticlesFailed', () => {
      const action = ArticlesActions.fetchFilteredArticlesFailed({ error: mockError });
      const state = articlesReducer(initialState, action);

      expect(state.callState.status).toBe('error');
      expect(state.callState.error).toEqual(mockError);
    });

    it('should set error state on fetchArticleFailed', () => {
      const action = ArticlesActions.fetchArticleFailed({ error: mockError });
      const state = articlesReducer(initialState, action);

      expect(state.callState.status).toBe('error');
    });

    it('should set error state on publishArticleFailed', () => {
      const action = ArticlesActions.publishArticleFailed({ error: mockError });
      const state = articlesReducer(initialState, action);

      expect(state.callState.status).toBe('error');
    });

    it('should set error state on updateArticleFailed', () => {
      const action = ArticlesActions.updateArticleFailed({ error: mockError });
      const state = articlesReducer(initialState, action);

      expect(state.callState.status).toBe('error');
    });

    it('should set error state on deleteArticleFailed', () => {
      const action = ArticlesActions.deleteArticleFailed({ error: mockError });
      const state = articlesReducer(initialState, action);

      expect(state.callState.status).toBe('error');
    });
  });

  describe('fetchHomePageArticlesSucceeded', () => {
    it('should add articles to state and update homePageArticles', () => {
      const articles = [MOCK_ARTICLES[0], MOCK_ARTICLES[1]];
      const action = ArticlesActions.fetchHomePageArticlesSucceeded({
        articles,
        totalCount: 2,
      });
      const state = articlesReducer(initialState, action);

      expect(state.ids.length).toBe(2);
      expect(state.entities['a7b8c9d0e1f2a3b4']?.article).toEqual(MOCK_ARTICLES[0]);
      expect(state.entities['b8c9d0e1f2a3b4c5']?.article).toEqual(MOCK_ARTICLES[1]);
      expect(state.homePageArticles).toEqual(articles);
      expect(state.totalCount).toBe(2);
      expect(state.lastHomePageFetch).toBeTruthy();
    });

    it('should reset callState to idle', () => {
      const previousState: ArticlesState = {
        ...initialState,
        callState: {
          status: 'loading',
          loadStart: new Date().toISOString(),
          error: null,
        },
      };

      const action = ArticlesActions.fetchHomePageArticlesSucceeded({
        articles: [MOCK_ARTICLES[0]],
        totalCount: 1,
      });
      const state = articlesReducer(previousState, action);

      expect(state.callState.status).toBe('idle');
      expect(state.callState.error).toBeNull();
    });

    it('should preserve formData with unsaved changes', () => {
      const modifiedFormData = {
        title: 'Modified Title',
        body: 'Modified Body',
        bannerImageId: 'img999',
      };

      const previousState: ArticlesState = articlesAdapter.upsertOne(
        {
          article: MOCK_ARTICLES[0],
          formData: modifiedFormData,
        },
        initialState,
      );

      const updatedArticle = { ...MOCK_ARTICLES[0], title: 'Updated from server' };
      const action = ArticlesActions.fetchHomePageArticlesSucceeded({
        articles: [updatedArticle],
        totalCount: 1,
      });
      const state = articlesReducer(previousState, action);

      // Should preserve modified formData since it differs from article
      expect(state.entities['a7b8c9d0e1f2a3b4']?.formData).toEqual(modifiedFormData);
      expect(state.entities['a7b8c9d0e1f2a3b4']?.article).toEqual(updatedArticle);
    });

    it('should update formData when there are no unsaved changes', () => {
      const previousState: ArticlesState = articlesAdapter.upsertOne(
        {
          article: MOCK_ARTICLES[0],
          formData: {
            title: MOCK_ARTICLES[0].title,
            body: MOCK_ARTICLES[0].body,
            bannerImageId: MOCK_ARTICLES[0].bannerImageId,
          },
        },
        initialState,
      );

      const updatedArticle = { ...MOCK_ARTICLES[0], title: 'Updated Title' };
      const action = ArticlesActions.fetchHomePageArticlesSucceeded({
        articles: [updatedArticle],
        totalCount: 1,
      });
      const state = articlesReducer(previousState, action);

      // Should update article but preserve formData (formData only updates on explicit actions)
      expect(state.entities['a7b8c9d0e1f2a3b4']?.article.title).toBe('Updated Title');
      expect(state.entities['a7b8c9d0e1f2a3b4']?.formData.title).toBe(
        MOCK_ARTICLES[0].title,
      );
    });
  });

  describe('fetchFilteredArticlesSucceeded', () => {
    it('should add articles to state and update filteredArticles', () => {
      const articles = [MOCK_ARTICLES[0]];
      const action = ArticlesActions.fetchFilteredArticlesSucceeded({
        articles,
        filteredCount: 1,
        totalCount: 10,
      });
      const state = articlesReducer(initialState, action);

      expect(state.ids.length).toBe(1);
      expect(state.entities['a7b8c9d0e1f2a3b4']?.article).toEqual(MOCK_ARTICLES[0]);
      expect(state.filteredArticles).toEqual(articles);
      expect(state.filteredCount).toBe(1);
      expect(state.totalCount).toBe(10);
      expect(state.lastFilteredFetch).toBeTruthy();
    });

    it('should reset callState', () => {
      const action = ArticlesActions.fetchFilteredArticlesSucceeded({
        articles: [],
        filteredCount: 0,
        totalCount: 0,
      });
      const state = articlesReducer(initialState, action);

      expect(state.callState.status).toBe('idle');
    });
  });

  describe('paginationOptionsChanged', () => {
    it('should update pagination options', () => {
      const newOptions = {
        ...initialState.options,
        page: 2,
        pageSize: 20,
      };

      const action = ArticlesActions.paginationOptionsChanged({
        options: newOptions,
        fetch: false,
      });
      const state = articlesReducer(initialState, action);

      expect(state.options.page).toBe(2);
      expect(state.options.pageSize).toBe(20);
    });

    it('should reset lastFilteredFetch', () => {
      const previousState: ArticlesState = {
        ...initialState,
        lastFilteredFetch: '2025-01-01T00:00:00.000Z',
      };

      const action = ArticlesActions.paginationOptionsChanged({
        options: { ...initialState.options, page: 2 },
        fetch: false,
      });
      const state = articlesReducer(previousState, action);

      expect(state.lastFilteredFetch).toBeNull();
    });
  });

  describe('fetchArticleSucceeded', () => {
    it('should add article to state', () => {
      const action = ArticlesActions.fetchArticleSucceeded({ article: MOCK_ARTICLES[0] });
      const state = articlesReducer(initialState, action);

      expect(state.entities['a7b8c9d0e1f2a3b4']?.article).toEqual(MOCK_ARTICLES[0]);
      expect(state.callState.status).toBe('idle');
    });

    it('should preserve existing formData when article already exists', () => {
      const existingFormData = {
        title: 'Existing Title',
        body: 'Existing Body',
        bannerImageId: 'img1',
      };

      const previousState: ArticlesState = articlesAdapter.upsertOne(
        {
          article: MOCK_ARTICLES[0],
          formData: existingFormData,
        },
        initialState,
      );

      const action = ArticlesActions.fetchArticleSucceeded({ article: MOCK_ARTICLES[0] });
      const state = articlesReducer(previousState, action);

      expect(state.entities['a7b8c9d0e1f2a3b4']?.formData).toEqual(existingFormData);
    });
  });

  describe('publishArticleSucceeded', () => {
    it('should add new article to state', () => {
      const action = ArticlesActions.publishArticleSucceeded({
        article: MOCK_ARTICLES[0],
      });
      const state = articlesReducer(initialState, action);

      expect(state.entities['a7b8c9d0e1f2a3b4']?.article).toEqual(MOCK_ARTICLES[0]);
      expect(state.callState.status).toBe('idle');
    });

    it('should reset newArticleFormData', () => {
      const previousState: ArticlesState = {
        ...initialState,
        newArticleFormData: {
          title: 'Draft Title',
          body: 'Draft Body',
          bannerImageId: 'img1',
        },
      };

      const action = ArticlesActions.publishArticleSucceeded({
        article: MOCK_ARTICLES[0],
      });
      const state = articlesReducer(previousState, action);

      expect(state.newArticleFormData).toEqual(INITIAL_ARTICLE_FORM_DATA);
    });

    it('should reset fetch timestamps', () => {
      const previousState: ArticlesState = {
        ...initialState,
        lastHomePageFetch: '2025-01-01T00:00:00.000Z',
        lastFilteredFetch: '2025-01-01T00:00:00.000Z',
      };

      const action = ArticlesActions.publishArticleSucceeded({
        article: MOCK_ARTICLES[0],
      });
      const state = articlesReducer(previousState, action);

      expect(state.lastHomePageFetch).toBeNull();
      expect(state.lastFilteredFetch).toBeNull();
    });
  });

  describe('updateArticleSucceeded', () => {
    it('should update existing article', () => {
      const previousState: ArticlesState = articlesAdapter.upsertOne(
        {
          article: MOCK_ARTICLES[0],
          formData: {
            title: MOCK_ARTICLES[0].title,
            body: MOCK_ARTICLES[0].body,
            bannerImageId: MOCK_ARTICLES[0].bannerImageId,
          },
        },
        initialState,
      );

      const updatedArticle = { ...MOCK_ARTICLES[0], title: 'Updated Title' };
      const action = ArticlesActions.updateArticleSucceeded({
        article: updatedArticle,
        originalArticleTitle: 'Test Article',
      });
      const state = articlesReducer(previousState, action);

      expect(state.entities['a7b8c9d0e1f2a3b4']?.article.title).toBe('Updated Title');
      expect(state.callState.status).toBe('idle');
    });

    it('should update formData to match article', () => {
      const previousState: ArticlesState = articlesAdapter.upsertOne(
        {
          article: MOCK_ARTICLES[0],
          formData: { title: 'Old Title', body: 'Old Body', bannerImageId: 'img1' },
        },
        initialState,
      );

      const updatedArticle = { ...MOCK_ARTICLES[0], title: 'New Title' };
      const action = ArticlesActions.updateArticleSucceeded({
        article: updatedArticle,
        originalArticleTitle: 'Old Title',
      });
      const state = articlesReducer(previousState, action);

      // Should update formData to match new article data
      expect(state.entities['a7b8c9d0e1f2a3b4']?.formData.title).toBe('New Title');
    });

    it('should reset fetch timestamps', () => {
      const previousState: ArticlesState = {
        ...initialState,
        lastHomePageFetch: '2025-01-01T00:00:00.000Z',
        lastFilteredFetch: '2025-01-01T00:00:00.000Z',
      };

      const action = ArticlesActions.updateArticleSucceeded({
        article: MOCK_ARTICLES[0],
        originalArticleTitle: 'Test Article',
      });
      const state = articlesReducer(previousState, action);

      expect(state.lastHomePageFetch).toBeNull();
      expect(state.lastFilteredFetch).toBeNull();
    });
  });

  describe('deleteArticleSucceeded', () => {
    it('should remove article from state', () => {
      const previousState: ArticlesState = articlesAdapter.upsertOne(
        {
          article: MOCK_ARTICLES[0],
          formData: {
            title: MOCK_ARTICLES[0].title,
            body: MOCK_ARTICLES[0].body,
            bannerImageId: MOCK_ARTICLES[0].bannerImageId,
          },
        },
        initialState,
      );

      const action = ArticlesActions.deleteArticleSucceeded({
        articleId: MOCK_ARTICLES[0].id,
        articleTitle: 'Test Article',
      });
      const state = articlesReducer(previousState, action);

      expect(state.entities['a7b8c9d0e1f2a3b4']).toBeUndefined();
      expect(state.ids.length).toBe(0);
      expect(state.callState.status).toBe('idle');
    });

    it('should reset fetch timestamps', () => {
      const previousState: ArticlesState = articlesAdapter.upsertOne(
        {
          article: MOCK_ARTICLES[0],
          formData: {
            title: MOCK_ARTICLES[0].title,
            body: MOCK_ARTICLES[0].body,
            bannerImageId: MOCK_ARTICLES[0].bannerImageId,
          },
        },
        {
          ...initialState,
          lastHomePageFetch: '2025-01-01T00:00:00.000Z',
          lastFilteredFetch: '2025-01-01T00:00:00.000Z',
        },
      );

      const action = ArticlesActions.deleteArticleSucceeded({
        articleId: MOCK_ARTICLES[0].id,
        articleTitle: 'Test Article',
      });
      const state = articlesReducer(previousState, action);

      expect(state.lastHomePageFetch).toBeNull();
      expect(state.lastFilteredFetch).toBeNull();
    });
  });

  describe('requestTimedOut', () => {
    it('should set timeout error', () => {
      const action = ArticlesActions.requestTimedOut();
      const state = articlesReducer(initialState, action);

      expect(state.callState.status).toBe('error');
      expect(state.callState.error).toEqual({
        name: 'LCCError',
        message: 'Request timed out',
      });
    });
  });

  describe('formDataChanged', () => {
    it('should update newArticleFormData when articleId is null', () => {
      const formData = { title: 'New Title' };
      const action = ArticlesActions.formDataChanged({ articleId: null, formData });
      const state = articlesReducer(initialState, action);

      expect(state.newArticleFormData.title).toBe('New Title');
    });

    it('should update existing article formData', () => {
      const previousState: ArticlesState = articlesAdapter.upsertOne(
        {
          article: MOCK_ARTICLES[0],
          formData: {
            title: MOCK_ARTICLES[0].title,
            body: MOCK_ARTICLES[0].body,
            bannerImageId: MOCK_ARTICLES[0].bannerImageId,
          },
        },
        initialState,
      );

      const formData = { title: 'Modified Title' };
      const action = ArticlesActions.formDataChanged({
        articleId: MOCK_ARTICLES[0].id,
        formData,
      });
      const state = articlesReducer(previousState, action);

      expect(state.entities['a7b8c9d0e1f2a3b4']?.formData.title).toBe('Modified Title');
      expect(state.entities['a7b8c9d0e1f2a3b4']?.formData.body).toBe(
        MOCK_ARTICLES[0].body,
      ); // Preserved
    });

    it('should not update entities when articleId does not exist', () => {
      const formData = { title: 'Title' };
      const action = ArticlesActions.formDataChanged({
        articleId: 'non-existent',
        formData,
      });
      const state = articlesReducer(initialState, action);

      expect(state.entities['non-existent']).toBeUndefined();
    });
  });

  describe('formDataRestored', () => {
    it('should reset newArticleFormData when articleId is null', () => {
      const previousState: ArticlesState = {
        ...initialState,
        newArticleFormData: {
          title: 'Draft Title',
          body: 'Draft Body',
          bannerImageId: 'img1',
        },
      };

      const action = ArticlesActions.formDataRestored({ articleId: null });
      const state = articlesReducer(previousState, action);

      expect(state.newArticleFormData).toEqual(INITIAL_ARTICLE_FORM_DATA);
    });

    it('should restore article formData from original article', () => {
      const previousState: ArticlesState = articlesAdapter.upsertOne(
        {
          article: MOCK_ARTICLES[0],
          formData: {
            title: 'Modified Title',
            body: 'Modified Body',
            bannerImageId: 'img999',
          },
        },
        initialState,
      );

      const action = ArticlesActions.formDataRestored({ articleId: MOCK_ARTICLES[0].id });
      const state = articlesReducer(previousState, action);

      expect(state.entities['a7b8c9d0e1f2a3b4']?.formData).toEqual({
        title: MOCK_ARTICLES[0].title,
        body: MOCK_ARTICLES[0].body,
        bannerImageId: MOCK_ARTICLES[0].bannerImageId,
      });
    });
  });

  describe('state immutability', () => {
    it('should not mutate the previous state', () => {
      const previousState: ArticlesState = { ...initialState };
      const originalState = { ...previousState };

      const action = ArticlesActions.fetchHomePageArticlesRequested();
      const state = articlesReducer(previousState, action);

      expect(previousState).toEqual(originalState);
      expect(state).not.toBe(previousState);
    });
  });
});
