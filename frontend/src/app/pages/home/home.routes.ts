import { Routes } from '@angular/router';

import { HomePageComponent } from './home-page.component';

export const HOME_ROUTES: Routes = [
  {
    path: '',
    component: HomePageComponent,
  },
  {
    path: '**',
    redirectTo: '',
  },
];
