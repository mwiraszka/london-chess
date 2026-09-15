import { Observable, from } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';

import {
  HTTP_INTERCEPTORS,
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
} from '@angular/common/http';
import { Injectable } from '@angular/core';

import { ClerkService } from '@app/services';

import { environment } from '@env';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private readonly clerkService: ClerkService) {}

  public intercept(
    req: HttpRequest<unknown>,
    handler: HttpHandler,
  ): Observable<HttpEvent<unknown>> {
    if (!req.url.startsWith(environment.lccApiBaseUrl)) {
      return handler.handle(req);
    }

    return from(this.clerkService.getToken()).pipe(
      map(token =>
        token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req,
      ),
      switchMap(authorizedReq => handler.handle(authorizedReq)),
    );
  }
}

export const AuthInterceptorProvider = {
  provide: HTTP_INTERCEPTORS,
  useClass: AuthInterceptor,
  multi: true,
};
