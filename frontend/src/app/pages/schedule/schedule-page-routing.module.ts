import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { widestEventsResolver } from '@app/resolvers/widest.resolvers';

import { SchedulePageComponent } from './schedule-page.component';

const routes: Routes = [
  {
    path: '',
    component: SchedulePageComponent,
    resolve: { widestEvents: widestEventsResolver },
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
