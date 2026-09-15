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
export class CacheControlInterceptor implements HttpInterceptor {
  intercept(
    req: HttpRequest<unknown>,
    handler: HttpHandler,
  ): Observable<HttpEvent<unknown>> {
    // Apply cache control to all image endpoints, except for metadata requests
    if (
      req.url.includes(`${environment.lccApiBaseUrl}/images`) &&
      !req.url.includes('metadata')
    ) {
      const modifiedReq = req.clone({
        setHeaders: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      });
      return handler.handle(modifiedReq);
    }
    return handler.handle(req);
  }
}

export const CacheControlInterceptorProvider = {
  provide: HTTP_INTERCEPTORS,
  useClass: CacheControlInterceptor,
  multi: true,
};
