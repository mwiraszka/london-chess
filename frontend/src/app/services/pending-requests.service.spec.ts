import { Subject, firstValueFrom, of } from 'rxjs';

import { TestBed } from '@angular/core/testing';

import { PendingRequestsService } from './pending-requests.service';

describe('PendingRequestsService', () => {
  let service: PendingRequestsService;

  beforeEach(() => {
    service = TestBed.inject(PendingRequestsService);
  });

  it('should start with no pending requests', () => {
    expect(service.hasPendingRequests()).toBe(false);
  });

  it('should not count a request until it is sent', () => {
    service.track(new Subject<void>());

    expect(service.hasPendingRequests()).toBe(false);
  });

  it('should count a request until it completes', () => {
    const request$ = new Subject<void>();

    service.track(request$).subscribe();

    expect(service.hasPendingRequests()).toBe(true);

    request$.complete();

    expect(service.hasPendingRequests()).toBe(false);
  });

  it('should stop counting a request that fails', () => {
    const request$ = new Subject<void>();
    service.track(request$).subscribe({ error: () => undefined });

    request$.error(new Error('Network error'));

    expect(service.hasPendingRequests()).toBe(false);
  });

  it('should stop counting a request that is cancelled', () => {
    const subscription = service.track(new Subject<void>()).subscribe();

    subscription.unsubscribe();

    expect(service.hasPendingRequests()).toBe(false);
  });

  it('should keep counting until every request has settled', () => {
    const first$ = new Subject<void>();
    const second$ = new Subject<void>();
    service.track(first$).subscribe();
    service.track(second$).subscribe();

    first$.complete();

    expect(service.hasPendingRequests()).toBe(true);

    second$.complete();

    expect(service.hasPendingRequests()).toBe(false);
  });

  it('should count each sending of the same request', () => {
    const request$ = new Subject<void>();
    const tracked$ = service.track(request$);
    const first = tracked$.subscribe();
    tracked$.subscribe();

    first.unsubscribe();

    expect(service.hasPendingRequests()).toBe(true);
  });

  it('should pass the response through', async () => {
    const response = await firstValueFrom(service.track(of('response')));

    expect(response).toBe('response');
    expect(service.hasPendingRequests()).toBe(false);
  });
});
