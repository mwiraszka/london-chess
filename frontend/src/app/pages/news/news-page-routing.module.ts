import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { NewsPageComponent } from './news-page.component';

const routes: Routes = [
  {
    path: '',
    component: NewsPageComponent,
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
export class NewsPageRoutingModule {}
