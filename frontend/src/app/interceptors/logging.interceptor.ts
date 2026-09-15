import { Observable } from 'rxjs';

import {
  HTTP_INTERCEPTORS,
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
} from '@angular/common/http';
import { Injectable } from '@angular/core';

import { environment } from '@env';

@Injectable()
export class LoggingInterceptor implements HttpInterceptor {
  intercept(
    req: HttpRequest<unknown>,
    handler: HttpHandler,
  ): Observable<HttpEvent<unknown>> {
    if (!environment.production) {
      console.info('Request', req.url);
    }
    return handler.handle(req);
  }
}

export const LoggingInterceptorProvider = {
  provide: HTTP_INTERCEPTORS,
  useClass: LoggingInterceptor,
  multi: true,
};
