import { provideStoreDevtools } from '@ngrx/store-devtools';

export const STORE_DEVTOOLS_PROVIDERS = [
  provideStoreDevtools({ name: 'London Chess Club - NgRx Store DevTools', maxAge: 100 }),
];
