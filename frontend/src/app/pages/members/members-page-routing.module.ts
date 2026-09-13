import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { MembersPageComponent } from './members-page.component';

const routes: Routes = [
  {
    path: '',
    component: MembersPageComponent,
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./member-profile-page.component').then(c => c.MemberProfilePageComponent),
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
export class MembersPageRoutingModule {}
