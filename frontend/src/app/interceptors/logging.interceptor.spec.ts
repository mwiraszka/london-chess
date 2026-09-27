import { of } from 'rxjs';

import { HttpEvent, HttpHandler, HttpRequest } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';

import { environment } from '@env';

import { LoggingInterceptor } from './logging.interceptor';

describe('LoggingInterceptor', () => {
  const production = environment.production;

  let interceptor: LoggingInterceptor;
  let handler: HttpHandler;
  let infoSpy: MockInstance;

  beforeEach(() => {
    handler = { handle: vi.fn().mockReturnValue(of({ type: 0 })) };

    TestBed.configureTestingModule({ providers: [LoggingInterceptor] });

    interceptor = TestBed.inject(LoggingInterceptor);
    infoSpy = vi.spyOn(console, 'info').mockImplementation(() => undefined);
  });

  afterEach(() => {
    environment.production = production;
  });

  it('should log the request outside production and pass it through', () => {
    const request = new HttpRequest('GET', '/api/test');
    const events: HttpEvent<unknown>[] = [];

    interceptor.intercept(request, handler).subscribe(event => events.push(event));

    expect(infoSpy).toHaveBeenCalledWith('Request', '/api/test');
    expect(handler.handle).toHaveBeenCalledWith(request);
    expect(events).toEqual([{ type: 0 }]);
  });

  it('should not log the request in production', () => {
    environment.production = true;
    const request = new HttpRequest('GET', '/api/test');

    interceptor.intercept(request, handler);

    expect(infoSpy).not.toHaveBeenCalled();
    expect(handler.handle).toHaveBeenCalledWith(request);
  });
});
