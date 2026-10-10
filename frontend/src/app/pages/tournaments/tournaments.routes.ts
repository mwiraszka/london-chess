import { Routes } from '@angular/router';

import { tournamentGuard } from '@app/guards/tournament.guard';

import { TournamentPageComponent } from './tournament-page.component';
import { TournamentsPageComponent } from './tournaments-page.component';

export const TOURNAMENTS_ROUTES: Routes = [
  {
    path: '',
    component: TournamentsPageComponent,
  },
  {
    path: ':number',
    canActivate: [tournamentGuard('number')],
    component: TournamentPageComponent,
  },
  {
    path: '**',
    redirectTo: '',
  },
];
