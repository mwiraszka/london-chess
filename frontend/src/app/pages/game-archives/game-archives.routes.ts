import { Routes } from '@angular/router';

import { gameGuard } from '@app/guards/game.guard';

import { GameArchivesPageComponent } from './game-archives-page.component';
import { GamePageComponent } from './game-page.component';

export const GAME_ARCHIVES_ROUTES: Routes = [
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
