import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { GameArchivesPageComponent } from './game-archives-page.component';

const routes: Routes = [
  {
    path: '',
    component: GameArchivesPageComponent,
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
