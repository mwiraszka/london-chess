import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { RegionalClubsPageComponent } from './regional-clubs-page.component';

const routes: Routes = [
  {
    path: '',
    component: RegionalClubsPageComponent,
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
export class RegionalClubsPageRoutingModule {}
