import { provideEagamiUi } from '@eagami/ui';
import { EffectsModule } from '@ngrx/effects';
import { StoreRouterConnectingModule } from '@ngrx/router-store';
import { Action, StoreModule } from '@ngrx/store';
import * as Sentry from '@sentry/angular';

import { provideHttpClient, withInterceptorsFromDi, withXhr } from '@angular/common/http';
import {
  ErrorHandler,
  enableProdMode,
  importProvidersFrom,
  inject,
  provideAppInitializer,
} from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import {
  provideRouter,
  withComponentInputBinding,
  withRouterConfig,
} from '@angular/router';

import { APP_ROUTES } from '@app/app.routes';
import {
  AuthInterceptorProvider,
  LoggingInterceptorProvider,
  PendingRequestsInterceptorProvider,
  TimeoutInterceptorProvider,
} from '@app/interceptors';
import { BrandService, ClerkService, UserService } from '@app/services';
import { AppStoreModule } from '@app/store/app';
import { ArticlesStoreModule } from '@app/store/articles';
import { AuthStoreModule } from '@app/store/auth';
import { EventsStoreModule } from '@app/store/events';
import { GamesStoreModule } from '@app/store/games';
import { ImagesStoreModule } from '@app/store/images';
import { MembersStoreModule } from '@app/store/members';
import { MetaState, metaReducers } from '@app/store/meta-reducers';
import { NavStoreModule } from '@app/store/nav';
import { STORE_DEVTOOLS_PROVIDERS } from '@app/store/store-devtools';
import { TournamentsStoreModule } from '@app/store/tournaments';

import { environment } from '@env';

import { AppComponent } from './app/app.component';

if (environment.production) {
  enableProdMode();
}

Sentry.init({
  dsn: environment.sentryDsn,
  environment: environment.production ? 'production' : 'development',
  enabled: !!environment.sentryDsn,
  tracesSampleRate: 0,
  // Raised by browser extensions running on the page, not by the app
  ignoreErrors: [/runtime\.sendMessage/, /Extension context invalidated/],
  denyUrls: [
    /^chrome-extension:\/\//,
    /^moz-extension:\/\//,
    /^safari-(web-)?extension:\/\//,
  ],
});

bootstrapApplication(AppComponent, {
  providers: [
    { provide: ErrorHandler, useValue: Sentry.createErrorHandler() },
    importProvidersFrom(
      AppStoreModule,
      ArticlesStoreModule,
      AuthStoreModule,
      EffectsModule.forRoot([]),
      EventsStoreModule,
      GamesStoreModule,
      ImagesStoreModule,
      MembersStoreModule,
      NavStoreModule,
      StoreModule.forRoot<MetaState, Action<string>>(
        {},
        {
          metaReducers,
          runtimeChecks: {
            strictStateSerializability: true,
            strictActionSerializability: true,
          },
        },
      ),
      StoreRouterConnectingModule.forRoot(),
      TournamentsStoreModule,
    ),
    ...STORE_DEVTOOLS_PROVIDERS,
    provideRouter(
      APP_ROUTES,
      withComponentInputBinding(),
      withRouterConfig({ onSameUrlNavigation: 'reload' }),
    ),
    provideHttpClient(withXhr(), withInterceptorsFromDi()),
    provideEagamiUi(),
    provideAppInitializer(() => {
      // Instantiate UserService so its login effect starts and the user record
      // is available app-wide once Clerk reports the session.
      inject(UserService);
      // Not awaited, so the first page renders while Clerk loads behind it
      inject(ClerkService)
        .load()
        .catch(error => console.error(`[LCC] Unable to load Clerk: ${error}`));
      // Awaited, so the first page opens in the brand the visit was left in, its fonts ready
      return inject(BrandService).ready;
    }),
    // Listed first so they also cover the time other interceptors spend
    PendingRequestsInterceptorProvider,
    TimeoutInterceptorProvider,
    AuthInterceptorProvider,
    LoggingInterceptorProvider,
  ],
}).catch(error => console.error(`[LCC] Bootstrap error: ${error}`));
