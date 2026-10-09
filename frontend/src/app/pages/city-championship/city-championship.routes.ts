import { Routes } from '@angular/router';

import { CityChampionshipPageComponent } from './city-championship-page.component';

export const CITY_CHAMPIONSHIP_ROUTES: Routes = [
  {
    path: '',
    component: CityChampionshipPageComponent,
  },
  {
    path: '**',
    redirectTo: '',
  },
];
