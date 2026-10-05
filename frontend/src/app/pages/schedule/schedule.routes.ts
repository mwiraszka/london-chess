import { Routes } from '@angular/router';

import { widestEventsResolver } from '@app/resolvers/widest.resolvers';

import { SchedulePageComponent } from './schedule-page.component';

export const SCHEDULE_ROUTES: Routes = [
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
