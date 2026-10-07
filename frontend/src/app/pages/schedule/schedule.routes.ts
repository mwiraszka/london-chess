import { Routes } from '@angular/router';

import { SchedulePageComponent } from './schedule-page.component';

export const SCHEDULE_ROUTES: Routes = [
  {
    path: '',
    component: SchedulePageComponent,
  },
  {
    path: '**',
    redirectTo: '',
  },
];
