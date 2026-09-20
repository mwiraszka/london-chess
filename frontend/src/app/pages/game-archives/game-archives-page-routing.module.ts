import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { gameGuard } from '@app/guards/game.guard';

import { GameArchivesPageComponent } from './game-archives-page.component';
import { GamePageComponent } from './game-page.component';

const routes: Routes = [
  {
    path: '',
    component: GameArchivesPageComponent,
  },
  {
    path: ':id',
    canActivate: [gameGuard('id')],
    component: GamePageComponent,
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
export class GameArchivesPageRoutingModule {}
