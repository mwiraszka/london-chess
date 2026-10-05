import { Routes } from '@angular/router';

import { FaqPageComponent } from './faq-page.component';

export const FAQ_ROUTES: Routes = [
  {
    path: '',
    component: FaqPageComponent,
  },
  {
    path: '**',
    redirectTo: '',
  },
];
