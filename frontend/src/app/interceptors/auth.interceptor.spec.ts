import { firstValueFrom, of } from 'rxjs';

import {
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
} from '@angular/common/http';
import { TestBed } from '@angular/core/testing';

import { ClerkService } from '@app/services';

import { environment } from '@env';

import { AuthInterceptor } from './auth.interceptor';

describe('AuthInterceptor', () => {
  let interceptor: HttpInterceptor;

  let getTokenSpy: Mock;
  let mockHandler: HttpHandler;
  let handleSpy: MockInstance;

  const apiUrl = `${environment.lccApiBaseUrl}/members`;

  beforeEach(() => {
    getTokenSpy = vi.fn().mockResolvedValue(null);

    mockHandler = {
      handle: vi.fn().mockReturnValue(of({} as HttpEvent<unknown>)),
    };

    TestBed.configureTestingModule({
      providers: [
        AuthInterceptor,
        { provide: ClerkService, useValue: { getToken: getTokenSpy } },
      ],
    });

    interceptor = TestBed.inject(AuthInterceptor);

    handleSpy = vi.spyOn(mockHandler, 'handle');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be created', () => {
    expect(interceptor).toBeTruthy();
  });

  it('should attach a bearer token to API requests when a session token exists', async () => {
    getTokenSpy.mockResolvedValue('token-123');
    const req = new HttpRequest('GET', apiUrl);

    await firstValueFrom(interceptor.intercept(req, mockHandler));

    const handledReq = handleSpy.mock.calls[0][0] as HttpRequest<unknown>;
    expect(handledReq.headers.get('Authorization')).toBe('Bearer token-123');
  });

  it('should forward API requests without an Authorization header when no token exists', async () => {
    getTokenSpy.mockResolvedValue(null);
    const req = new HttpRequest('GET', apiUrl);

    await firstValueFrom(interceptor.intercept(req, mockHandler));

    const handledReq = handleSpy.mock.calls[0][0] as HttpRequest<unknown>;
    expect(handledReq.headers.has('Authorization')).toBe(false);
  });

  it('should pass non-API requests through without requesting a token', async () => {
    const req = new HttpRequest('GET', 'https://example.com/data');

    await firstValueFrom(interceptor.intercept(req, mockHandler));

    expect(getTokenSpy).not.toHaveBeenCalled();
    expect(handleSpy).toHaveBeenCalledWith(req);
  });
});
