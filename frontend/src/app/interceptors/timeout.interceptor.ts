import { Observable, TimeoutError, throwError } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';

import {
  HTTP_INTERCEPTORS,
  HttpErrorResponse,
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
} from '@angular/common/http';
import { Injectable } from '@angular/core';

import { REQUEST_TIMEOUT, REQUEST_TIMEOUT_MESSAGE } from '@app/constants/http';

import { environment } from '@env';

@Injectable()
export class TimeoutInterceptor implements HttpInterceptor {
  intercept(
    req: HttpRequest<unknown>,
    handler: HttpHandler,
  ): Observable<HttpEvent<unknown>> {
    if (!req.url.startsWith(environment.lccApiBaseUrl)) {
      return handler.handle(req);
    }

    return handler.handle(req).pipe(
      timeout(req.context.get(REQUEST_TIMEOUT)),
      catchError((error: unknown) =>
        throwError(() =>
          error instanceof TimeoutError
            ? new HttpErrorResponse({
                error: { message: REQUEST_TIMEOUT_MESSAGE },
                url: req.url,
              })
            : error,
        ),
      ),
    );
  }
}

export const TimeoutInterceptorProvider = {
  provide: HTTP_INTERCEPTORS,
  useClass: TimeoutInterceptor,
  multi: true,
};
