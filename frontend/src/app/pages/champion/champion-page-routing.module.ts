import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { ChampionPageComponent } from './champion-page.component';

const routes: Routes = [
  {
    path: '',
    component: ChampionPageComponent,
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
export class ChampionPageRoutingModule {}
