import { Subject } from 'rxjs';

import {
  HttpContext,
  HttpErrorResponse,
  HttpEvent,
  HttpEventType,
  HttpHandler,
  HttpRequest,
  HttpResponse,
} from '@angular/common/http';
import { TestBed } from '@angular/core/testing';

import {
  REQUEST_TIMEOUT,
  REQUEST_TIMEOUT_MESSAGE,
  REQUEST_TIMEOUT_MS,
  UPLOAD_TIMEOUT_MS,
} from '@app/constants/http';

import { environment } from '@env';

import { TimeoutInterceptor } from './timeout.interceptor';

describe('TimeoutInterceptor', () => {
  let interceptor: TimeoutInterceptor;
  let handler: HttpHandler;
  let response$: Subject<HttpEvent<unknown>>;

  let errorSpy: Mock;
  let nextSpy: Mock;

  const apiUrl = `${environment.lccApiBaseUrl}/articles`;

  function send(request: HttpRequest<unknown>): void {
    interceptor.intercept(request, handler).subscribe({ next: nextSpy, error: errorSpy });
  }

  beforeEach(() => {
    vi.useFakeTimers();

    response$ = new Subject<HttpEvent<unknown>>();
    handler = { handle: vi.fn().mockReturnValue(response$) };
    errorSpy = vi.fn();
    nextSpy = vi.fn();

    TestBed.configureTestingModule({
      providers: [TimeoutInterceptor],
    });

    interceptor = TestBed.inject(TimeoutInterceptor);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should fail an API request that outlasts the standard timeout', () => {
    send(new HttpRequest('GET', apiUrl));

    vi.advanceTimersByTime(REQUEST_TIMEOUT_MS - 1);

    expect(errorSpy).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);

    expect(errorSpy).toHaveBeenCalledTimes(1);
    const error: HttpErrorResponse = errorSpy.mock.calls[0][0];
    expect(error).toBeInstanceOf(HttpErrorResponse);
    expect(error.error).toEqual({ message: REQUEST_TIMEOUT_MESSAGE });
    expect(error.url).toBe(apiUrl);
  });

  it('should let a response that arrives in time through', () => {
    const response = new HttpResponse({ status: 200, body: { data: [] } });
    send(new HttpRequest('GET', apiUrl));

    vi.advanceTimersByTime(REQUEST_TIMEOUT_MS - 1);
    response$.next(response);
    response$.complete();
    vi.advanceTimersByTime(REQUEST_TIMEOUT_MS);

    expect(nextSpy).toHaveBeenCalledWith(response);
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('should give a request the timeout set in its context', () => {
    send(
      new HttpRequest('POST', apiUrl, null, {
        context: new HttpContext().set(REQUEST_TIMEOUT, UPLOAD_TIMEOUT_MS),
      }),
    );

    vi.advanceTimersByTime(REQUEST_TIMEOUT_MS);

    expect(errorSpy).not.toHaveBeenCalled();

    vi.advanceTimersByTime(UPLOAD_TIMEOUT_MS - REQUEST_TIMEOUT_MS);

    expect(errorSpy).toHaveBeenCalledTimes(1);
  });

  it('should restart the countdown whenever the request makes progress', () => {
    send(new HttpRequest('POST', apiUrl, null));

    vi.advanceTimersByTime(REQUEST_TIMEOUT_MS - 1);
    response$.next({ type: HttpEventType.UploadProgress, loaded: 1, total: 2 });
    vi.advanceTimersByTime(REQUEST_TIMEOUT_MS - 1);

    expect(errorSpy).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);

    expect(errorSpy).toHaveBeenCalledTimes(1);
  });

  it('should pass other errors through unchanged', () => {
    const serverError = new HttpErrorResponse({ status: 500, url: apiUrl });
    send(new HttpRequest('GET', apiUrl));

    response$.error(serverError);

    expect(errorSpy).toHaveBeenCalledWith(serverError);
  });

  it('should leave requests to other hosts alone', () => {
    const request = new HttpRequest('GET', 'https://example.com/data');

    send(request);
    vi.advanceTimersByTime(UPLOAD_TIMEOUT_MS * 2);

    expect(handler.handle).toHaveBeenCalledWith(request);
    expect(errorSpy).not.toHaveBeenCalled();
  });
});
