import { provideMockActions } from '@ngrx/effects/testing';
import { Action } from '@ngrx/store';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { ReplaySubject, firstValueFrom, of, throwError } from 'rxjs';

import { TestBed } from '@angular/core/testing';

import { INITIAL_ARTICLE_FORM_DATA, MAX_ARTICLE_BODY_IMAGES } from '@app/constants';
import { MOCK_ARTICLES } from '@app/mocks/articles.mock';
import { ApiResponse, Article, LccError, PaginatedItems, User } from '@app/models';
import { ArticlesApiService } from '@app/services';
import { AuthSelectors } from '@app/store/auth';
import { NavSelectors } from '@app/store/nav';
import { IS_EXPIRED, PARSE_ERROR } from '@app/tokens';
import moment from '@app/utils/datetime/moment';

import { ArticlesActions, ArticlesSelectors } from '.';
import { ArticlesEffects } from './articles.effects';

const mockParseError = vi.fn();
const mockIsExpired = vi.fn();

describe('ArticlesEffects', () => {
  let actions$: ReplaySubject<Action>;
  let effects: ArticlesEffects;
  let articlesApiService: Mocked<ArticlesApiService>;
  let store: MockStore;

  const mockUser: User = {
    id: 'user123',
    firstName: 'Test',
    lastName: 'User',
    email: 'test@example.com',
    isAdmin: true,
    memberNumber: null,
  };

  const mockError: LccError = {
    name: 'LCCError',
    message: 'Test error',
  };

  const mockApiResponse: ApiResponse<PaginatedItems<Article>> = {
    data: {
      items: [MOCK_ARTICLES[0], MOCK_ARTICLES[1]],
      filteredCount: 2,
      totalCount: 5,
    },
  };

  const mockArticlesState = {
    ids: MOCK_ARTICLES.map(a => a.id),
    entities: MOCK_ARTICLES.reduce(
      (acc, article) => ({
        ...acc,
        [article.id]: { article, formData: INITIAL_ARTICLE_FORM_DATA },
      }),
      {},
    ),
    failedLoads: [],
    isFetchingFiltered: false,
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
  };

  beforeEach(() => {
    const articlesApiServiceMock = {
      getFilteredArticles: vi.fn(),
      getArticle: vi.fn(),
      addArticle: vi.fn(),
      updateArticle: vi.fn(),
      deleteArticle: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        ArticlesEffects,
        { provide: IS_EXPIRED, useValue: mockIsExpired },
        { provide: PARSE_ERROR, useValue: mockParseError },
        provideMockActions(() => actions$),
        { provide: ArticlesApiService, useValue: articlesApiServiceMock },
        provideMockStore({
          initialState: {
            articlesState: mockArticlesState,
            navState: { pathHistory: [] },
          },
        }),
      ],
    });

    effects = TestBed.inject(ArticlesEffects);
    articlesApiService = TestBed.inject(ArticlesApiService) as Mocked<ArticlesApiService>;
    store = TestBed.inject(MockStore);
    actions$ = new ReplaySubject<Action>(1);

    vi.clearAllMocks();
    mockParseError.mockImplementation(error => error);
  });

  afterEach(() => store.resetSelectors());

  describe('fetchHomePageArticles$', () => {
    it('should fetch home page articles with correct options', async () => {
      articlesApiService.getFilteredArticles.mockReturnValue(of(mockApiResponse));

      actions$.next(ArticlesActions.fetchHomePageArticlesRequested());
      const action = await firstValueFrom(effects.fetchHomePageArticles$);

      expect(action).toEqual(
        ArticlesActions.fetchHomePageArticlesSucceeded({
          articles: mockApiResponse.data.items,
        }),
      );
      expect(articlesApiService.getFilteredArticles).toHaveBeenCalledWith({
        page: 1,
        pageSize: 10,
        sortBy: 'bookmarkDate',
        sortOrder: 'desc',
        filters: null,
        search: '',
      });
    });

    it('should handle fetch home page articles failure', async () => {
      articlesApiService.getFilteredArticles.mockReturnValue(throwError(() => mockError));
      mockParseError.mockReturnValue(mockError);

      actions$.next(ArticlesActions.fetchHomePageArticlesRequested());
      const action = await firstValueFrom(effects.fetchHomePageArticles$);

      expect(action).toEqual(
        ArticlesActions.fetchHomePageArticlesFailed({ error: mockError }),
      );
    });
  });

  describe('fetchFilteredArticles$', () => {
    const mockOptions = {
      page: 2,
      pageSize: 10,
      sortBy: 'title' as const,
      sortOrder: 'asc' as const,
      filters: null,
      search: 'tournament',
    };

    beforeEach(() => {
      store.overrideSelector(ArticlesSelectors.selectOptions, mockOptions);
      store.refreshState();
    });

    it('should fetch filtered articles with options from store', async () => {
      articlesApiService.getFilteredArticles.mockReturnValue(of(mockApiResponse));

      actions$.next(ArticlesActions.fetchFilteredArticlesRequested());
      const action = await firstValueFrom(effects.fetchFilteredArticles$);

      expect(action).toEqual(
        ArticlesActions.fetchFilteredArticlesSucceeded({
          articles: mockApiResponse.data.items,
          filteredCount: mockApiResponse.data.filteredCount,
        }),
      );
      expect(articlesApiService.getFilteredArticles).toHaveBeenCalledWith(mockOptions);
    });

    it('should handle fetch filtered articles failure', async () => {
      articlesApiService.getFilteredArticles.mockReturnValue(throwError(() => mockError));
      mockParseError.mockReturnValue(mockError);

      actions$.next(ArticlesActions.fetchFilteredArticlesRequested());
      const action = await firstValueFrom(effects.fetchFilteredArticles$);

      expect(action).toEqual(
        ArticlesActions.fetchFilteredArticlesFailed({ error: mockError }),
      );
    });
  });

  describe('refetchHomePageArticles$', () => {
    it('should check for stale home page articles as soon as it starts', () => {
      vi.useFakeTimers();
      store.overrideSelector(ArticlesSelectors.selectLastHomePageFetch, null);
      store.refreshState();
      mockIsExpired.mockReturnValue(true);
      const results: Action[] = [];

      effects.refetchHomePageArticles$.subscribe(action => results.push(action));
      vi.advanceTimersByTime(0);

      expect(results).toEqual([ArticlesActions.fetchHomePageArticlesRequested()]);
    });

    it('should trigger refetch after publishArticleSucceeded', async () => {
      actions$.next(
        ArticlesActions.publishArticleSucceeded({ article: MOCK_ARTICLES[0] }),
      );
      const action = await firstValueFrom(effects.refetchHomePageArticles$);

      expect(action).toEqual(ArticlesActions.fetchHomePageArticlesRequested());
    });

    it('should trigger refetch after updateArticleSucceeded', async () => {
      actions$.next(
        ArticlesActions.updateArticleSucceeded({
          article: MOCK_ARTICLES[0],
          originalArticleTitle: 'Old Title',
        }),
      );
      const action = await firstValueFrom(effects.refetchHomePageArticles$);

      expect(action).toEqual(ArticlesActions.fetchHomePageArticlesRequested());
    });

    it('should trigger refetch after deleteArticleSucceeded', async () => {
      actions$.next(
        ArticlesActions.deleteArticleSucceeded({
          articleId: MOCK_ARTICLES[0].id,
          articleTitle: MOCK_ARTICLES[0].title,
        }),
      );
      const action = await firstValueFrom(effects.refetchHomePageArticles$);

      expect(action).toEqual(ArticlesActions.fetchHomePageArticlesRequested());
    });

    it('should trigger refetch when last fetch is expired', () => {
      vi.useFakeTimers();
      const expiredTimestamp = moment().subtract(20, 'minutes').toISOString();
      store.overrideSelector(ArticlesSelectors.selectLastHomePageFetch, expiredTimestamp);
      store.refreshState();
      mockIsExpired.mockReturnValue(true);

      const results: Action[] = [];
      effects.refetchHomePageArticles$.subscribe(action => {
        results.push(action);
      });

      vi.advanceTimersByTime(3000);
      vi.advanceTimersByTime(10 * 60 * 1000);

      expect(results[0]).toEqual(ArticlesActions.fetchHomePageArticlesRequested());
      expect(mockIsExpired).toHaveBeenCalledWith(expiredTimestamp);
    });

    it('should not trigger refetch when last fetch is not expired', () => {
      vi.useFakeTimers();
      const recentTimestamp = moment().subtract(5, 'minutes').toISOString();
      store.overrideSelector(ArticlesSelectors.selectLastHomePageFetch, recentTimestamp);
      store.refreshState();
      mockIsExpired.mockReturnValue(false);

      const results: Action[] = [];
      effects.refetchHomePageArticles$.subscribe(action => {
        results.push(action);
      });

      vi.advanceTimersByTime(3000);
      vi.advanceTimersByTime(10 * 60 * 1000);

      expect(results).toHaveLength(0);
    });
  });

  describe('refetchFilteredArticles$', () => {
    it('should trigger refetch after publishArticleSucceeded', async () => {
      actions$.next(
        ArticlesActions.publishArticleSucceeded({ article: MOCK_ARTICLES[0] }),
      );
      const action = await firstValueFrom(effects.refetchFilteredArticles$);

      expect(action).toEqual(ArticlesActions.fetchFilteredArticlesRequested());
    });

    it('should trigger refetch after updateArticleSucceeded', async () => {
      actions$.next(
        ArticlesActions.updateArticleSucceeded({
          article: MOCK_ARTICLES[0],
          originalArticleTitle: 'Old Title',
        }),
      );
      const action = await firstValueFrom(effects.refetchFilteredArticles$);

      expect(action).toEqual(ArticlesActions.fetchFilteredArticlesRequested());
    });

    it('should trigger refetch after deleteArticleSucceeded', async () => {
      actions$.next(
        ArticlesActions.deleteArticleSucceeded({
          articleId: MOCK_ARTICLES[0].id,
          articleTitle: MOCK_ARTICLES[0].title,
        }),
      );
      const action = await firstValueFrom(effects.refetchFilteredArticles$);

      expect(action).toEqual(ArticlesActions.fetchFilteredArticlesRequested());
    });

    it('should trigger refetch after paginationOptionsChanged', async () => {
      actions$.next(
        ArticlesActions.paginationOptionsChanged({
          options: {
            page: 1,
            pageSize: 10,
            sortBy: 'bookmarkDate',
            sortOrder: 'desc',
            filters: null,
            search: '',
          },
        }),
      );
      const action = await firstValueFrom(effects.refetchFilteredArticles$);

      expect(action).toEqual(ArticlesActions.fetchFilteredArticlesRequested());
    });

    it('should check for stale articles as soon as it starts', () => {
      vi.useFakeTimers();
      store.overrideSelector(ArticlesSelectors.selectLastFilteredFetch, null);
      store.overrideSelector(NavSelectors.selectCurrentPath, '/articles');
      store.refreshState();
      mockIsExpired.mockReturnValue(true);
      const results: Action[] = [];

      effects.refetchFilteredArticles$.subscribe(action => results.push(action));
      vi.advanceTimersByTime(0);

      expect(results).toEqual([ArticlesActions.fetchFilteredArticlesRequested()]);
    });

    it('should trigger refetch when last fetch is expired', () => {
      vi.useFakeTimers();
      const expiredTimestamp = moment().subtract(20, 'minutes').toISOString();
      store.overrideSelector(ArticlesSelectors.selectLastFilteredFetch, expiredTimestamp);
      store.overrideSelector(NavSelectors.selectCurrentPath, '/articles');
      store.refreshState();
      mockIsExpired.mockReturnValue(true);

      const results: Action[] = [];
      effects.refetchFilteredArticles$.subscribe(action => {
        results.push(action);
      });

      vi.advanceTimersByTime(3000);
      vi.advanceTimersByTime(10 * 60 * 1000);

      expect(results[0]).toEqual(ArticlesActions.fetchFilteredArticlesRequested());
      expect(mockIsExpired).toHaveBeenCalledWith(expiredTimestamp);
    });

    it('should not trigger refetch when last fetch is not expired', () => {
      vi.useFakeTimers();
      const recentTimestamp = moment().subtract(5, 'minutes').toISOString();
      store.overrideSelector(ArticlesSelectors.selectLastFilteredFetch, recentTimestamp);
      store.overrideSelector(NavSelectors.selectCurrentPath, '/articles');
      store.refreshState();
      mockIsExpired.mockReturnValue(false);

      const results: Action[] = [];
      effects.refetchFilteredArticles$.subscribe(action => {
        results.push(action);
      });

      vi.advanceTimersByTime(3000);
      vi.advanceTimersByTime(10 * 60 * 1000);

      expect(results).toHaveLength(0);
    });
  });

  describe('fetchArticle$', () => {
    it('should fetch a single article successfully', async () => {
      const mockResponse: ApiResponse<Article> = { data: MOCK_ARTICLES[0] };
      articlesApiService.getArticle.mockReturnValue(of(mockResponse));

      actions$.next(
        ArticlesActions.fetchArticleRequested({ articleId: MOCK_ARTICLES[0].id }),
      );
      const action = await firstValueFrom(effects.fetchArticle$);

      expect(action).toEqual(
        ArticlesActions.fetchArticleSucceeded({ article: MOCK_ARTICLES[0] }),
      );
      expect(articlesApiService.getArticle).toHaveBeenCalledWith(MOCK_ARTICLES[0].id);
    });

    it('should handle fetch article failure', async () => {
      articlesApiService.getArticle.mockReturnValue(throwError(() => mockError));
      mockParseError.mockReturnValue(mockError);

      actions$.next(ArticlesActions.fetchArticleRequested({ articleId: 'invalid-id' }));
      const action = await firstValueFrom(effects.fetchArticle$);

      expect(action).toEqual(ArticlesActions.fetchArticleFailed({ error: mockError }));
    });
  });

  describe('publishArticle$', () => {
    beforeEach(() => {
      store.overrideSelector(AuthSelectors.selectUser, mockUser);
      store.refreshState();
    });

    it('should publish article successfully', async () => {
      const mockPublishResponse: ApiResponse<string> = { data: 'new-article-id' };

      articlesApiService.addArticle.mockReturnValue(of(mockPublishResponse));

      actions$.next(ArticlesActions.publishArticleRequested());
      const action = await firstValueFrom(effects.publishArticle$);

      expect(action.type).toBe(ArticlesActions.publishArticleSucceeded.type);
      const payload = (
        action as ReturnType<typeof ArticlesActions.publishArticleSucceeded>
      ).article;
      expect(payload.id).toBe('new-article-id');
      expect(payload.modificationInfo.createdBy).toBe('Test User');
      expect(payload.modificationInfo.lastEditedBy).toBe('Test User');
      expect(articlesApiService.addArticle).toHaveBeenCalled();
    });

    it('should handle publish article failure', async () => {
      articlesApiService.addArticle.mockReturnValue(throwError(() => mockError));
      mockParseError.mockReturnValue(mockError);

      actions$.next(ArticlesActions.publishArticleRequested());
      const action = await firstValueFrom(effects.publishArticle$);

      expect(action).toEqual(ArticlesActions.publishArticleFailed({ error: mockError }));
    });

    it('should fail if article has too many body images', async () => {
      const bodyWithTooManyImages = Array(MAX_ARTICLE_BODY_IMAGES + 1)
        .fill('{{{image-id}}}')
        .join(' ');

      store.setState({
        articlesState: {
          ...mockArticlesState,
          newArticleFormData: {
            ...INITIAL_ARTICLE_FORM_DATA,
            body: bodyWithTooManyImages,
          },
        },
        authState: { user: mockUser },
      });

      actions$.next(ArticlesActions.publishArticleRequested());
      const action = await firstValueFrom(effects.publishArticle$);

      expect(action.type).toBe(ArticlesActions.publishArticleFailed.type);
      const payload = action as ReturnType<typeof ArticlesActions.publishArticleFailed>;
      expect(payload.error.message).toContain(
        `maximum of ${MAX_ARTICLE_BODY_IMAGES} body images`,
      );
    });
  });

  describe('updateArticle$', () => {
    beforeEach(() => {
      store.overrideSelector(AuthSelectors.selectUser, mockUser);
      store.refreshState();
    });

    it('should update article successfully', async () => {
      const articleId = MOCK_ARTICLES[0].id;
      const mockUpdateResponse: ApiResponse<string> = { data: articleId };

      articlesApiService.updateArticle.mockReturnValue(of(mockUpdateResponse));

      actions$.next(ArticlesActions.updateArticleRequested({ articleId }));
      const action = await firstValueFrom(effects.updateArticle$);

      expect(action.type).toBe(ArticlesActions.updateArticleSucceeded.type);
      const payload = action as ReturnType<typeof ArticlesActions.updateArticleSucceeded>;
      expect(payload.article.id).toBe(articleId);
      expect(payload.article.modificationInfo.lastEditedBy).toBe('Test User');
      expect(payload.originalArticleTitle).toBe(MOCK_ARTICLES[0].title);
      expect(articlesApiService.updateArticle).toHaveBeenCalled();
    });

    it('should handle update article failure', async () => {
      const articleId = MOCK_ARTICLES[0].id;

      articlesApiService.updateArticle.mockReturnValue(throwError(() => mockError));
      mockParseError.mockReturnValue(mockError);

      actions$.next(ArticlesActions.updateArticleRequested({ articleId }));
      const action = await firstValueFrom(effects.updateArticle$);

      expect(action).toEqual(ArticlesActions.updateArticleFailed({ error: mockError }));
    });

    it('should fail if updated article has too many body images', async () => {
      const articleId = MOCK_ARTICLES[0].id;
      const bodyWithTooManyImages = Array(MAX_ARTICLE_BODY_IMAGES + 1)
        .fill('{{{image-id}}}')
        .join(' ');

      store.setState({
        articlesState: {
          ...mockArticlesState,
          entities: {
            ...mockArticlesState.entities,
            [articleId]: {
              article: MOCK_ARTICLES[0],
              formData: {
                ...INITIAL_ARTICLE_FORM_DATA,
                body: bodyWithTooManyImages,
              },
            },
          },
        },
        authState: { user: mockUser },
      });

      actions$.next(ArticlesActions.updateArticleRequested({ articleId }));
      const action = await firstValueFrom(effects.updateArticle$);

      expect(action.type).toBe(ArticlesActions.updateArticleFailed.type);
      const payload = action as ReturnType<typeof ArticlesActions.updateArticleFailed>;
      expect(payload.error.message).toContain(
        `maximum of ${MAX_ARTICLE_BODY_IMAGES} body images`,
      );
    });
  });

  describe('updateArticleBookmarkRequested$', () => {
    it('should update article bookmark to true successfully', async () => {
      const articleId = MOCK_ARTICLES[0].id;
      const mockUpdateResponse: ApiResponse<string> = { data: articleId };

      articlesApiService.updateArticle.mockReturnValue(of(mockUpdateResponse));

      actions$.next(
        ArticlesActions.updateArticleBookmarkRequested({ articleId, bookmark: true }),
      );
      const action = await firstValueFrom(effects.updateArticleBookmarkRequested$);

      expect(action.type).toBe(ArticlesActions.updateArticleSucceeded.type);
      const payload = action as ReturnType<typeof ArticlesActions.updateArticleSucceeded>;
      expect(payload.article.bookmarkDate).not.toBeNull();
      expect(articlesApiService.updateArticle).toHaveBeenCalled();
    });

    it('should update article bookmark to false successfully', async () => {
      const articleId = MOCK_ARTICLES[0].id;
      const mockUpdateResponse: ApiResponse<string> = { data: articleId };

      articlesApiService.updateArticle.mockReturnValue(of(mockUpdateResponse));

      actions$.next(
        ArticlesActions.updateArticleBookmarkRequested({ articleId, bookmark: false }),
      );
      const action = await firstValueFrom(effects.updateArticleBookmarkRequested$);

      expect(action.type).toBe(ArticlesActions.updateArticleSucceeded.type);
      const payload = action as ReturnType<typeof ArticlesActions.updateArticleSucceeded>;
      expect(payload.article.bookmarkDate).toBeNull();
    });

    it('should handle update article bookmark failure', async () => {
      const articleId = MOCK_ARTICLES[0].id;

      articlesApiService.updateArticle.mockReturnValue(throwError(() => mockError));
      mockParseError.mockReturnValue(mockError);

      actions$.next(
        ArticlesActions.updateArticleBookmarkRequested({ articleId, bookmark: true }),
      );
      const action = await firstValueFrom(effects.updateArticleBookmarkRequested$);

      expect(action).toEqual(ArticlesActions.updateArticleFailed({ error: mockError }));
    });
  });

  describe('deleteArticle$', () => {
    it('should delete article successfully', async () => {
      const mockDeleteResponse: ApiResponse<string> = { data: MOCK_ARTICLES[0].id };
      articlesApiService.deleteArticle.mockReturnValue(of(mockDeleteResponse));

      actions$.next(
        ArticlesActions.deleteArticleRequested({ article: MOCK_ARTICLES[0] }),
      );
      const action = await firstValueFrom(effects.deleteArticle$);

      expect(action).toEqual(
        ArticlesActions.deleteArticleSucceeded({
          articleId: MOCK_ARTICLES[0].id,
          articleTitle: MOCK_ARTICLES[0].title,
        }),
      );
      expect(articlesApiService.deleteArticle).toHaveBeenCalledWith(MOCK_ARTICLES[0].id);
    });

    it('should handle delete article failure', async () => {
      articlesApiService.deleteArticle.mockReturnValue(throwError(() => mockError));
      mockParseError.mockReturnValue(mockError);

      actions$.next(
        ArticlesActions.deleteArticleRequested({ article: MOCK_ARTICLES[0] }),
      );
      const action = await firstValueFrom(effects.deleteArticle$);

      expect(action).toEqual(ArticlesActions.deleteArticleFailed({ error: mockError }));
    });
  });
});
