import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { memberNumberGuard } from '@app/guards/member-number.guard';

import { MembersPageComponent } from './members-page.component';

const routes: Routes = [
  {
    path: '',
    component: MembersPageComponent,
  },
  {
    path: ':number',
    canActivate: [memberNumberGuard('number')],
    loadComponent: () =>
      import('./member-profile-page.component').then(c => c.MemberProfilePageComponent),
  },
  {
    path: '**',
    redirectTo: '/',
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class MembersPageRoutingModule {}
