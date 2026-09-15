import { applyPalette, derivePalette, provideEagamiUi } from '@eagami/ui';
import { EffectsModule } from '@ngrx/effects';
import { StoreRouterConnectingModule, routerReducer } from '@ngrx/router-store';
import { Action, StoreModule } from '@ngrx/store';
import { StoreDevtoolsModule } from '@ngrx/store-devtools';
import * as Sentry from '@sentry/angular';
import { MarkdownModule } from 'ngx-markdown';

import {
  provideHttpClient,
  withInterceptorsFromDi,
  withJsonpSupport,
  withXhr,
} from '@angular/common/http';
import {
  ErrorHandler,
  enableProdMode,
  importProvidersFrom,
  inject,
  provideAppInitializer,
} from '@angular/core';
import { BrowserModule, bootstrapApplication } from '@angular/platform-browser';

import { AppRoutingModule } from '@app/app-routing.module';
import {
  AuthInterceptorProvider,
  CacheControlInterceptorProvider,
  LoggingInterceptorProvider,
} from '@app/interceptors';
import { ClerkService, UserService } from '@app/services';
import { AppStoreModule } from '@app/store/app';
import { ArticlesStoreModule } from '@app/store/articles';
import { AuthStoreModule } from '@app/store/auth';
import { EventsStoreModule } from '@app/store/events';
import { ImagesStoreModule } from '@app/store/images';
import { MembersStoreModule } from '@app/store/members';
import { MetaState, metaReducers } from '@app/store/meta-reducers';
import { NavStoreModule } from '@app/store/nav';
import { actionSanitizer } from '@app/utils';

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
});

applyPalette(
  derivePalette({
    primary: { base: '#608ea9' },
    secondary: { base: '#dd7027' },
  }),
);

bootstrapApplication(AppComponent, {
  providers: [
    { provide: ErrorHandler, useValue: Sentry.createErrorHandler() },
    importProvidersFrom(
      AppRoutingModule,
      AppStoreModule,
      ArticlesStoreModule,
      AuthStoreModule,
      BrowserModule,
      EffectsModule.forRoot([]),
      EventsStoreModule,
      ImagesStoreModule,
      MarkdownModule.forRoot(),
      MembersStoreModule,
      NavStoreModule,
      StoreModule.forRoot<MetaState, Action<string>>(
        { routerState: routerReducer },
        {
          metaReducers,
          runtimeChecks: {
            strictStateSerializability: true,
            strictActionSerializability: true,
          },
        },
      ),
      StoreDevtoolsModule.instrument({
        name: 'London Chess Club - NgRx Store DevTools',
        logOnly: environment.production,
        maxAge: 100,
        actionSanitizer,
      }),
      StoreRouterConnectingModule.forRoot(),
    ),
    provideHttpClient(withXhr(), withInterceptorsFromDi(), withJsonpSupport()),
    provideEagamiUi(),
    provideAppInitializer(async () => {
      const clerkService = inject(ClerkService);
      // Instantiate UserService so its login effect starts and the user record
      // is available app-wide once Clerk reports the session.
      inject(UserService);

      try {
        await clerkService.load();
      } catch (error) {
        console.error(`[LCC] Unable to load Clerk: ${error}`);
      }
    }),
    AuthInterceptorProvider,
    CacheControlInterceptorProvider,
    LoggingInterceptorProvider,
  ],
}).catch(error => console.error(`[LCC] Bootstrap error: ${error}`));
