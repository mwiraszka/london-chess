import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { collectionIdGuard } from '@app/guards/collection-id.guard';

import { MembersPageComponent } from './members-page.component';

const routes: Routes = [
  {
    path: '',
    component: MembersPageComponent,
  },
  {
    path: ':id',
    canActivate: [collectionIdGuard('id')],
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
