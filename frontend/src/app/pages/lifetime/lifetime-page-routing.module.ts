import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { LifetimePageComponent } from './lifetime-page.component';

const routes: Routes = [
  {
    path: '',
    component: LifetimePageComponent,
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
export class LifetimePageRoutingModule {}
