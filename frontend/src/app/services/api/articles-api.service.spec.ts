import { HttpParams } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { MOCK_ARTICLES } from '@app/mocks/articles.mock';
import {
  ApiResponse,
  Article,
  DataPaginationOptions,
  Id,
  PaginatedItems,
} from '@app/models';
import { SET_PAGINATION_PARAMS } from '@app/tokens';

import { environment } from '@env';

import { ArticlesApiService } from './articles-api.service';

describe('ArticlesApiService', () => {
  let service: ArticlesApiService;
  let httpMock: HttpTestingController;

  const apiBaseUrl = `${environment.lccApiBaseUrl}/articles`;
  const mockArticle = MOCK_ARTICLES[0];

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ArticlesApiService,
        provideHttpClientTesting(),
        { provide: SET_PAGINATION_PARAMS, useValue: vi.fn() },
      ],
    });

    service = TestBed.inject(ArticlesApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getFilteredArticles', () => {
    it('should get filtered articles with pagination params', () => {
      const mockPaginatedResponse: ApiResponse<PaginatedItems<Article>> = {
        data: {
          items: [mockArticle],
          filteredCount: 1,
          totalCount: 1,
        },
      };

      const options: DataPaginationOptions<Article> = {
        page: 2,
        pageSize: 20,
        sortBy: 'title',
        sortOrder: 'asc',
        filters: null,
        search: 'blitz',
      };

      const mockParams = new HttpParams()
        .set('page', '2')
        .set('pageSize', '20')
        .set('sortBy', 'title')
        .set('sortOrder', 'asc')
        .set('search', 'blitz');
      vi.mocked(TestBed.inject(SET_PAGINATION_PARAMS)).mockReturnValue(mockParams);

      service.getFilteredArticles(options).subscribe(response => {
        expect(response).toEqual(mockPaginatedResponse);
        expect(TestBed.inject(SET_PAGINATION_PARAMS)).toHaveBeenCalledWith(options);
      });

      const req = httpMock.expectOne(
        request =>
          request.url === apiBaseUrl &&
          request.params.get('page') === '2' &&
          request.params.get('pageSize') === '20',
      );
      expect(req.request.method).toBe('GET');
      req.flush(mockPaginatedResponse);
    });
  });

  describe('getArticle', () => {
    it('should get article by id', () => {
      const mockResponse: ApiResponse<Article> = {
        data: mockArticle,
      };

      service.getArticle('123').subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${apiBaseUrl}/123`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });
  });

  describe('addArticle', () => {
    it('should add new article', () => {
      const newArticle: Article = { ...mockArticle, id: '' };
      const mockResponse: ApiResponse<Id> = {
        data: mockArticle.id,
      };

      service.addArticle(newArticle).subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(apiBaseUrl);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(newArticle);
      req.flush(mockResponse);
    });
  });

  describe('updateArticle', () => {
    it('should update existing article', () => {
      const mockResponse: ApiResponse<Id> = {
        data: mockArticle.id,
      };

      service.updateArticle(mockArticle).subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${apiBaseUrl}/${mockArticle.id}`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(mockArticle);
      req.flush(mockResponse);
    });
  });

  describe('deleteArticle', () => {
    it('should delete article by id', () => {
      const mockResponse: ApiResponse<Id> = {
        data: mockArticle.id,
      };

      service.deleteArticle(mockArticle.id).subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${apiBaseUrl}/${mockArticle.id}`);
      expect(req.request.method).toBe('DELETE');
      expect(req.request.body).toBeNull();
      req.flush(mockResponse);
    });
  });
});
