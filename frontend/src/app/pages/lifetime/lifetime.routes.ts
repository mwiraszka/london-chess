import { Routes } from '@angular/router';

import { LifetimePageComponent } from './lifetime-page.component';

export const LIFETIME_ROUTES: Routes = [
  {
    path: '',
    component: LifetimePageComponent,
  },
  {
    path: '**',
    redirectTo: '',
  },
];
