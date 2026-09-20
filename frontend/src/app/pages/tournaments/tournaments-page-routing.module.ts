import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { tournamentGuard } from '@app/guards/tournament.guard';

import { TournamentPageComponent } from './tournament-page.component';
import { TournamentsPageComponent } from './tournaments-page.component';

const routes: Routes = [
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

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class TournamentsPageRoutingModule {}
