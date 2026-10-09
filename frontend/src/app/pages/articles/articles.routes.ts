import { Routes } from '@angular/router';

import { ArticlesPageComponent } from './articles-page.component';

export const ARTICLES_ROUTES: Routes = [
  {
    path: '',
    component: ArticlesPageComponent,
  },
  {
    path: '**',
    redirectTo: '',
  },
];
