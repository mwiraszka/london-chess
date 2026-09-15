import { of } from 'rxjs';

import { HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';

import { environment } from '@env';

import { CacheControlInterceptor } from './cache-control.interceptor';

describe('CacheControlInterceptor', () => {
  let interceptor: HttpInterceptor;

  let mockHandler: HttpHandler;

  let cloneSpy: MockInstance;
  let handleSpy: MockInstance;

  beforeEach(() => {
    mockHandler = {
      handle: vi.fn().mockReturnValue(of({})),
    };

    TestBed.configureTestingModule({
      providers: [CacheControlInterceptor],
    });

    interceptor = TestBed.inject(CacheControlInterceptor);

    handleSpy = vi.spyOn(mockHandler, 'handle');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be created', () => {
    expect(interceptor).toBeTruthy();
  });

  describe('intercept', () => {
    it('should add cache control headers to image requests', () => {
      const imageUrl = `${environment.lccApiBaseUrl}/images/test.jpg`;
      const mockRequest = new HttpRequest('GET', imageUrl);

      cloneSpy = vi.spyOn(mockRequest, 'clone');

      interceptor.intercept(mockRequest, mockHandler as HttpHandler);

      expect(cloneSpy).toHaveBeenCalledWith({
        setHeaders: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      });
    });

    it('should not add cache control headers to non-image requests', () => {
      const nonImageUrl = `${environment.lccApiBaseUrl}/articles`;
      const mockRequest = new HttpRequest('GET', nonImageUrl);

      cloneSpy = vi.spyOn(mockRequest, 'clone');

      interceptor.intercept(mockRequest, mockHandler);

      expect(cloneSpy).not.toHaveBeenCalled();
      expect(handleSpy).toHaveBeenCalledWith(mockRequest);
    });

    it('should not add cache control headers to image metadata requests', () => {
      const metadataUrl = `${environment.lccApiBaseUrl}/images/metadata`;
      const mockRequest = new HttpRequest('GET', metadataUrl);

      cloneSpy = vi.spyOn(mockRequest, 'clone');

      interceptor.intercept(mockRequest, mockHandler);

      expect(cloneSpy).not.toHaveBeenCalled();
      expect(handleSpy).toHaveBeenCalledWith(mockRequest);
    });

    it('should handle image upload requests', () => {
      const uploadUrl = `${environment.lccApiBaseUrl}/images`;
      const mockRequest = new HttpRequest('POST', uploadUrl, {});

      cloneSpy = vi.spyOn(mockRequest, 'clone');

      interceptor.intercept(mockRequest, mockHandler);

      expect(cloneSpy).toHaveBeenCalled();
    });

    it('should handle image deletion requests', () => {
      const deleteUrl = `${environment.lccApiBaseUrl}/images/123`;
      const mockRequest = new HttpRequest('DELETE', deleteUrl);

      cloneSpy = vi.spyOn(mockRequest, 'clone');

      interceptor.intercept(mockRequest, mockHandler);

      expect(cloneSpy).toHaveBeenCalled();
    });

    it('should pass through requests to other endpoints', () => {
      const otherUrl = 'https://other-api.com/data';
      const mockRequest = new HttpRequest('GET', otherUrl);

      cloneSpy = vi.spyOn(mockRequest, 'clone');

      interceptor.intercept(mockRequest, mockHandler);

      expect(cloneSpy).not.toHaveBeenCalled();
      expect(handleSpy).toHaveBeenCalledWith(mockRequest);
    });

    it('should handle nested image paths', () => {
      const nestedUrl = `${environment.lccApiBaseUrl}/images/albums/2024/test.jpg`;
      const mockRequest = new HttpRequest('GET', nestedUrl);

      cloneSpy = vi.spyOn(mockRequest, 'clone');

      interceptor.intercept(mockRequest, mockHandler);

      expect(cloneSpy).toHaveBeenCalledWith({
        setHeaders: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      });
    });
  });
});
