import { Routes } from '@angular/router';

import { ChampionPageComponent } from './champion-page.component';

export const CHAMPION_ROUTES: Routes = [
  {
    path: '',
    component: ChampionPageComponent,
  },
  {
    path: '**',
    redirectTo: '',
  },
];
