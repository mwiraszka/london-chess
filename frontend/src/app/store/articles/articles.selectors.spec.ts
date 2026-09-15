import { INITIAL_ARTICLE_FORM_DATA } from '@app/constants';
import { MOCK_ARTICLES } from '@app/mocks/articles.mock';
import { Article, ArticleFormData, CallState, DataPaginationOptions } from '@app/models';

import { ArticlesState, articlesAdapter } from './articles.reducer';
import * as ArticlesSelectors from './articles.selectors';

describe('Articles Selectors', () => {
  const mockCallState: CallState = {
    status: 'idle',
    error: null,
    loadStart: null,
  };

  const mockOptions: DataPaginationOptions<Article> = {
    page: 1,
    pageSize: 10,
    sortBy: 'bookmarkDate',
    sortOrder: 'desc',
    filters: null,
    search: '',
  };

  const mockArticleFormData: ArticleFormData = {
    title: 'Test Article Title',
    body: 'Test article body',
    bannerImageId: 'img-123',
  };

  const mockArticlesState: ArticlesState = {
    ...articlesAdapter.getInitialState({
      callState: mockCallState,
      newArticleFormData: INITIAL_ARTICLE_FORM_DATA,
      lastHomePageFetch: '2025-01-15T10:00:00.000Z',
      lastFilteredFetch: '2025-01-14T12:00:00.000Z',
      homePageArticles: [MOCK_ARTICLES[0], MOCK_ARTICLES[1]],
      filteredArticles: [MOCK_ARTICLES[2], MOCK_ARTICLES[3]],
      options: mockOptions,
      filteredCount: 15,
      totalCount: 25,
    }),
    entities: {
      [MOCK_ARTICLES[0].id]: {
        article: MOCK_ARTICLES[0],
        formData: mockArticleFormData,
      },
      [MOCK_ARTICLES[1].id]: {
        article: MOCK_ARTICLES[1],
        formData: INITIAL_ARTICLE_FORM_DATA,
      },
    },
    ids: [MOCK_ARTICLES[0].id, MOCK_ARTICLES[1].id],
  };

  describe('selectCallState', () => {
    it('should select the call state', () => {
      const result = ArticlesSelectors.selectCallState.projector(mockArticlesState);

      expect(result).toEqual(mockCallState);
    });

    it('should select loading call state', () => {
      const loadingCallState: CallState = {
        status: 'loading',
        error: null,
        loadStart: '2025-01-15T10:00:00.000Z',
      };
      const state: ArticlesState = {
        ...mockArticlesState,
        callState: loadingCallState,
      };

      const result = ArticlesSelectors.selectCallState.projector(state);

      expect(result).toEqual(loadingCallState);
    });
  });

  describe('selectLastHomePageFetch', () => {
    it('should select the last home page fetch timestamp', () => {
      const result =
        ArticlesSelectors.selectLastHomePageFetch.projector(mockArticlesState);

      expect(result).toBe('2025-01-15T10:00:00.000Z');
    });

    it('should return null when last home page fetch is null', () => {
      const state: ArticlesState = {
        ...mockArticlesState,
        lastHomePageFetch: null,
      };

      const result = ArticlesSelectors.selectLastHomePageFetch.projector(state);

      expect(result).toBeNull();
    });
  });

  describe('selectLastFilteredFetch', () => {
    it('should select the last filtered fetch timestamp', () => {
      const result =
        ArticlesSelectors.selectLastFilteredFetch.projector(mockArticlesState);

      expect(result).toBe('2025-01-14T12:00:00.000Z');
    });

    it('should return null when last filtered fetch is null', () => {
      const state: ArticlesState = {
        ...mockArticlesState,
        lastFilteredFetch: null,
      };

      const result = ArticlesSelectors.selectLastFilteredFetch.projector(state);

      expect(result).toBeNull();
    });
  });

  describe('selectHomePageArticles', () => {
    it('should select the home page articles', () => {
      const result =
        ArticlesSelectors.selectHomePageArticles.projector(mockArticlesState);

      expect(result).toEqual([MOCK_ARTICLES[0], MOCK_ARTICLES[1]]);
    });

    it('should return empty array when no home page articles', () => {
      const state: ArticlesState = {
        ...mockArticlesState,
        homePageArticles: [],
      };

      const result = ArticlesSelectors.selectHomePageArticles.projector(state);

      expect(result).toEqual([]);
    });
  });

  describe('selectFilteredArticles', () => {
    it('should select the filtered articles', () => {
      const result =
        ArticlesSelectors.selectFilteredArticles.projector(mockArticlesState);

      expect(result).toEqual([MOCK_ARTICLES[2], MOCK_ARTICLES[3]]);
    });

    it('should return empty array when no filtered articles', () => {
      const state: ArticlesState = {
        ...mockArticlesState,
        filteredArticles: [],
      };

      const result = ArticlesSelectors.selectFilteredArticles.projector(state);

      expect(result).toEqual([]);
    });
  });

  describe('selectOptions', () => {
    it('should select the data pagination options', () => {
      const result = ArticlesSelectors.selectOptions.projector(mockArticlesState);

      expect(result).toEqual(mockOptions);
    });

    it('should select updated options', () => {
      const newOptions: DataPaginationOptions<Article> = {
        ...mockOptions,
        page: 2,
        sortBy: 'title',
      };
      const state: ArticlesState = {
        ...mockArticlesState,
        options: newOptions,
      };

      const result = ArticlesSelectors.selectOptions.projector(state);

      expect(result).toEqual(newOptions);
    });
  });

  describe('selectFilteredCount', () => {
    it('should select the filtered count', () => {
      const result = ArticlesSelectors.selectFilteredCount.projector(mockArticlesState);

      expect(result).toBe(15);
    });

    it('should return null when filtered count is null', () => {
      const state: ArticlesState = {
        ...mockArticlesState,
        filteredCount: null,
      };

      const result = ArticlesSelectors.selectFilteredCount.projector(state);

      expect(result).toBeNull();
    });
  });

  describe('selectTotalCount', () => {
    it('should select the total count', () => {
      const result = ArticlesSelectors.selectTotalCount.projector(mockArticlesState);

      expect(result).toBe(25);
    });

    it('should select zero when total count is zero', () => {
      const state: ArticlesState = {
        ...mockArticlesState,
        totalCount: 0,
      };

      const result = ArticlesSelectors.selectTotalCount.projector(state);

      expect(result).toBe(0);
    });
  });

  describe('selectAllArticles', () => {
    it('should select all articles from entities', () => {
      const allArticleEntities = [
        { article: MOCK_ARTICLES[0], formData: mockArticleFormData },
        { article: MOCK_ARTICLES[1], formData: INITIAL_ARTICLE_FORM_DATA },
      ];

      const result = ArticlesSelectors.selectAllArticles.projector(allArticleEntities);

      expect(result).toEqual([MOCK_ARTICLES[0], MOCK_ARTICLES[1]]);
    });

    it('should return empty array when no entities', () => {
      const result = ArticlesSelectors.selectAllArticles.projector([]);

      expect(result).toEqual([]);
    });
  });

  describe('selectArticleById', () => {
    it('should select article by id when it exists', () => {
      const allArticles = [MOCK_ARTICLES[0], MOCK_ARTICLES[1], MOCK_ARTICLES[2]];

      const selector = ArticlesSelectors.selectArticleById(MOCK_ARTICLES[1].id);
      const result = selector.projector(allArticles);

      expect(result).toEqual(MOCK_ARTICLES[1]);
    });

    it('should return null when article id does not exist', () => {
      const allArticles = [MOCK_ARTICLES[0], MOCK_ARTICLES[1]];

      const selector = ArticlesSelectors.selectArticleById('non-existent-id');
      const result = selector.projector(allArticles);

      expect(result).toBeNull();
    });

    it('should return null when id is null', () => {
      const allArticles = [MOCK_ARTICLES[0], MOCK_ARTICLES[1]];

      const selector = ArticlesSelectors.selectArticleById(null);
      const result = selector.projector(allArticles);

      expect(result).toBeNull();
    });

    it('should return null when articles array is empty', () => {
      const selector = ArticlesSelectors.selectArticleById(MOCK_ARTICLES[0].id);
      const result = selector.projector([]);

      expect(result).toBeNull();
    });
  });

  describe('selectArticleFormDataById', () => {
    it('should select form data for existing article', () => {
      const allArticleEntities = [
        { article: MOCK_ARTICLES[0], formData: mockArticleFormData },
        { article: MOCK_ARTICLES[1], formData: INITIAL_ARTICLE_FORM_DATA },
      ];

      const selector = ArticlesSelectors.selectArticleFormDataById(MOCK_ARTICLES[0].id);
      const result = selector.projector(mockArticlesState, allArticleEntities);

      expect(result).toEqual(mockArticleFormData);
    });

    it('should return newArticleFormData when article id is null', () => {
      const allArticleEntities = [
        { article: MOCK_ARTICLES[0], formData: mockArticleFormData },
      ];

      const selector = ArticlesSelectors.selectArticleFormDataById(null);
      const result = selector.projector(mockArticlesState, allArticleEntities);

      expect(result).toEqual(INITIAL_ARTICLE_FORM_DATA);
    });

    it('should return newArticleFormData when article not found', () => {
      const allArticleEntities = [
        { article: MOCK_ARTICLES[0], formData: mockArticleFormData },
      ];

      const selector = ArticlesSelectors.selectArticleFormDataById('non-existent-id');
      const result = selector.projector(mockArticlesState, allArticleEntities);

      expect(result).toEqual(INITIAL_ARTICLE_FORM_DATA);
    });

    it('should return different newArticleFormData when state is updated', () => {
      const customFormData: ArticleFormData = {
        title: 'Custom Title',
        body: 'Custom Body',
        bannerImageId: 'img-456',
      };
      const state: ArticlesState = {
        ...mockArticlesState,
        newArticleFormData: customFormData,
      };
      const allArticleEntities = [
        { article: MOCK_ARTICLES[0], formData: mockArticleFormData },
      ];

      const selector = ArticlesSelectors.selectArticleFormDataById(null);
      const result = selector.projector(state, allArticleEntities);

      expect(result).toEqual(customFormData);
    });
  });

  describe('selectHasUnsavedChanges', () => {
    it('should return false when article and form data are the same', () => {
      const article: Article = {
        ...MOCK_ARTICLES[0],
        title: 'Same Title',
        body: 'Same Body',
        bannerImageId: 'img-123',
      };
      const formData: ArticleFormData = {
        title: 'Same Title',
        body: 'Same Body',
        bannerImageId: 'img-123',
      };

      const selector = ArticlesSelectors.selectHasUnsavedChanges(article.id);
      const result = selector.projector(article, formData);

      expect(result).toBe(false);
    });

    it('should return true when title has changed', () => {
      const article: Article = {
        ...MOCK_ARTICLES[0],
        title: 'Original Title',
        body: 'Same Body',
        bannerImageId: 'img-123',
      };
      const formData: ArticleFormData = {
        title: 'Modified Title',
        body: 'Same Body',
        bannerImageId: 'img-123',
      };

      const selector = ArticlesSelectors.selectHasUnsavedChanges(article.id);
      const result = selector.projector(article, formData);

      expect(result).toBe(true);
    });

    it('should return true when body has changed', () => {
      const article: Article = {
        ...MOCK_ARTICLES[0],
        title: 'Same Title',
        body: 'Original Body',
        bannerImageId: 'img-123',
      };
      const formData: ArticleFormData = {
        title: 'Same Title',
        body: 'Modified Body',
        bannerImageId: 'img-123',
      };

      const selector = ArticlesSelectors.selectHasUnsavedChanges(article.id);
      const result = selector.projector(article, formData);

      expect(result).toBe(true);
    });

    it('should return true when bannerImageId has changed', () => {
      const article: Article = {
        ...MOCK_ARTICLES[0],
        title: 'Same Title',
        body: 'Same Body',
        bannerImageId: 'img-123',
      };
      const formData: ArticleFormData = {
        title: 'Same Title',
        body: 'Same Body',
        bannerImageId: 'img-456',
      };

      const selector = ArticlesSelectors.selectHasUnsavedChanges(article.id);
      const result = selector.projector(article, formData);

      expect(result).toBe(true);
    });

    it('should return false for new article with initial form data', () => {
      const selector = ArticlesSelectors.selectHasUnsavedChanges(null);
      const result = selector.projector(null, INITIAL_ARTICLE_FORM_DATA);

      expect(result).toBe(false);
    });

    it('should return true for new article with modified form data', () => {
      const modifiedFormData: ArticleFormData = {
        ...INITIAL_ARTICLE_FORM_DATA,
        title: 'New Article Title',
      };

      const selector = ArticlesSelectors.selectHasUnsavedChanges(null);
      const result = selector.projector(null, modifiedFormData);

      expect(result).toBe(true);
    });
  });
});
