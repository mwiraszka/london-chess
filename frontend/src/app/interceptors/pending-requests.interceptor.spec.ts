import { Subject, firstValueFrom, of } from 'rxjs';
import { toArray } from 'rxjs/operators';

import { HttpEvent, HttpHandler, HttpRequest, HttpResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';

import { PendingRequestsService } from '@app/services';

import { environment } from '@env';

import { PendingRequestsInterceptor } from './pending-requests.interceptor';

describe('PendingRequestsInterceptor', () => {
  let interceptor: PendingRequestsInterceptor;
  let pendingRequests: PendingRequestsService;

  const request = new HttpRequest('GET', `${environment.lccApiBaseUrl}/articles`);

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [PendingRequestsInterceptor],
    });

    interceptor = TestBed.inject(PendingRequestsInterceptor);
    pendingRequests = TestBed.inject(PendingRequestsService);
  });

  it('should count the request as pending until its response arrives', () => {
    const response$ = new Subject<HttpEvent<unknown>>();
    const handler: HttpHandler = { handle: vi.fn().mockReturnValue(response$) };

    interceptor.intercept(request, handler).subscribe();

    expect(pendingRequests.hasPendingRequests()).toBe(true);

    response$.next(new HttpResponse({ status: 200 }));
    response$.complete();

    expect(pendingRequests.hasPendingRequests()).toBe(false);
  });

  it('should pass the request and its response through unchanged', async () => {
    const response = new HttpResponse({ status: 200, body: { data: [] } });
    const handler: HttpHandler = { handle: vi.fn().mockReturnValue(of(response)) };

    const events = await firstValueFrom(
      interceptor.intercept(request, handler).pipe(toArray()),
    );

    expect(handler.handle).toHaveBeenCalledWith(request);
    expect(events).toEqual([response]);
  });
});
