import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { SchedulePageComponent } from './schedule-page.component';

const routes: Routes = [
  {
    path: '',
    component: SchedulePageComponent,
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
export class SchedulePageRoutingModule {}
