import { Routes } from '@angular/router';

import { memberProfileGuard } from '@app/guards/member-profile.guard';
import { widestMembersResolver } from '@app/resolvers/widest.resolvers';

import { MembersPageComponent } from './members-page.component';

export const MEMBERS_ROUTES: Routes = [
  {
    path: '',
    component: MembersPageComponent,
    resolve: { widestMembers: widestMembersResolver },
  },
  {
    path: ':number',
    canActivate: [memberProfileGuard('number')],
    loadComponent: () =>
      import('./member-profile-page.component').then(c => c.MemberProfilePageComponent),
  },
  {
    path: '**',
    redirectTo: '/',
  },
];
