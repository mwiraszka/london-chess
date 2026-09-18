import { Observable } from 'rxjs';

import {
  HTTP_INTERCEPTORS,
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
} from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { PendingRequestsService } from '@app/services';

@Injectable()
export class PendingRequestsInterceptor implements HttpInterceptor {
  private readonly pendingRequests = inject(PendingRequestsService);

  intercept(
    req: HttpRequest<unknown>,
    handler: HttpHandler,
  ): Observable<HttpEvent<unknown>> {
    return this.pendingRequests.track(handler.handle(req));
  }
}

export const PendingRequestsInterceptorProvider = {
  provide: HTTP_INTERCEPTORS,
  useClass: PendingRequestsInterceptor,
  multi: true,
};
