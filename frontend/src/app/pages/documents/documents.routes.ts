import { Routes } from '@angular/router';

import { DocumentsPageComponent } from './documents-page.component';

export const DOCUMENTS_ROUTES: Routes = [
  {
    path: '',
    component: DocumentsPageComponent,
  },
  {
    path: '**',
    redirectTo: '',
  },
];
