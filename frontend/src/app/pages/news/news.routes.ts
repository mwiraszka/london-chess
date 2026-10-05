import { Routes } from '@angular/router';

import { NewsPageComponent } from './news-page.component';

export const NEWS_ROUTES: Routes = [
  {
    path: '',
    component: NewsPageComponent,
  },
  {
    path: '**',
    redirectTo: '',
  },
];
