import { of } from 'rxjs';

import {
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
} from '@angular/common/http';
import { TestBed } from '@angular/core/testing';

import { LoggingInterceptor } from './logging.interceptor';

describe('LoggingInterceptor', () => {
  let interceptor: HttpInterceptor;

  let mockHandler: HttpHandler;

  let handleSpy: MockInstance;

  beforeEach(() => {
    mockHandler = {
      handle: vi.fn().mockReturnValue(of({})),
    };

    TestBed.configureTestingModule({
      providers: [LoggingInterceptor],
    });

    interceptor = TestBed.inject(LoggingInterceptor);

    handleSpy = vi.spyOn(mockHandler, 'handle');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be created', () => {
    expect(interceptor).toBeTruthy();
  });

  describe('intercept', () => {
    it('should pass request through handler', () => {
      const mockRequest = new HttpRequest('GET', '/api/test');

      interceptor.intercept(mockRequest, mockHandler);

      expect(handleSpy).toHaveBeenCalledWith(mockRequest);
    });

    it('should return handler response', () =>
      withDone(done => {
        const mockRequest = new HttpRequest('GET', '/api/test');
        const mockResponse = { status: 200, data: 'test' };

        handleSpy.mockReturnValue(of(mockResponse));

        interceptor.intercept(mockRequest, mockHandler).subscribe({
          next: (response: HttpEvent<unknown>) => {
            expect(response).toEqual(mockResponse);
            done();
          },
        });
      }));

    it('should handle POST requests', () => {
      const mockRequest = new HttpRequest('POST', '/api/create', { data: 'test' });

      interceptor.intercept(mockRequest, mockHandler);

      expect(handleSpy).toHaveBeenCalledWith(mockRequest);
    });

    it('should handle PUT requests', () => {
      const mockRequest = new HttpRequest('PUT', '/api/update/123', { data: 'updated' });

      interceptor.intercept(mockRequest, mockHandler);

      expect(handleSpy).toHaveBeenCalledWith(mockRequest);
    });

    it('should handle DELETE requests', () => {
      const mockRequest = new HttpRequest('DELETE', '/api/delete/123');

      interceptor.intercept(mockRequest, mockHandler);

      expect(handleSpy).toHaveBeenCalledWith(mockRequest);
    });

    it('should handle requests with query parameters', () => {
      const mockRequest = new HttpRequest('GET', '/api/test?param1=value1&param2=value2');

      interceptor.intercept(mockRequest, mockHandler);

      expect(handleSpy).toHaveBeenCalledWith(mockRequest);
    });

    it('should handle requests with different base URLs', () => {
      const mockRequest = new HttpRequest('GET', 'https://external-api.com/data');

      interceptor.intercept(mockRequest, mockHandler);

      expect(handleSpy).toHaveBeenCalledWith(mockRequest);
    });
  });
});
