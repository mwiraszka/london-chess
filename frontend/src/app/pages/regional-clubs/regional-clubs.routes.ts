import { Routes } from '@angular/router';

import { RegionalClubsPageComponent } from './regional-clubs-page.component';

export const REGIONAL_CLUBS_ROUTES: Routes = [
  {
    path: '',
    component: RegionalClubsPageComponent,
  },
  {
    path: '**',
    redirectTo: '',
  },
];
