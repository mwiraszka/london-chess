import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { AuthGuard, loggedInGuard } from '@app/guards/auth.guard';

const routes: Routes = [
  {
    path: '',
    loadChildren: () =>
      import('./pages/home/home-page-routing.module').then(m => m.HomePageRoutingModule),
    pathMatch: 'full',
  },
  {
    path: 'account',
    redirectTo: 'account/profile',
    pathMatch: 'full',
  },
  {
    path: 'account/:section',
    canActivate: [loggedInGuard],
    loadComponent: () =>
      import('./pages/account/account-page.component').then(c => c.AccountPageComponent),
  },
  {
    path: 'accept-invitation',
    loadComponent: () =>
      import('./pages/accept-invitation/accept-invitation-page.component').then(
        c => c.AcceptInvitationPageComponent,
      ),
  },
  {
    path: 'about',
    loadChildren: () =>
      import('./pages/about/about-page-routing.module').then(
        m => m.AboutPageRoutingModule,
      ),
  },
  {
    path: 'album',
    loadChildren: () =>
      import('./pages/album/album-page-routing.module').then(
        m => m.AlbumPageRoutingModule,
      ),
    canActivate: [AuthGuard],
  },
  {
    path: 'article',
    loadChildren: () =>
      import('./pages/article/article-page-routing.module').then(
        m => m.ArticlePageRoutingModule,
      ),
  },
  {
    path: 'city-champion',
    loadChildren: () =>
      import('./pages/champion/champion-page-routing.module').then(
        m => m.ChampionPageRoutingModule,
      ),
  },
  {
    path: 'documents',
    loadChildren: () =>
      import('./pages/documents/documents-page-routing.module').then(
        m => m.DocumentsPageRoutingModule,
      ),
  },
  {
    path: 'event',
    loadChildren: () =>
      import('./pages/event/event-page-routing.module').then(
        m => m.EventPageRoutingModule,
      ),
    canActivate: [AuthGuard],
  },
  {
    path: 'game-archives',
    loadChildren: () =>
      import('./pages/game-archives/game-archives-page-routing.module').then(
        m => m.GameArchivesPageRoutingModule,
      ),
  },
  {
    path: 'image',
    loadChildren: () =>
      import('./pages/image/image-page-routing.module').then(
        m => m.ImagePageRoutingModule,
      ),
    canActivate: [AuthGuard],
  },
  {
    path: 'lifetime-achievement-awards',
    loadChildren: () =>
      import('./pages/lifetime/lifetime-page-routing.module').then(
        m => m.LifetimePageRoutingModule,
      ),
  },
  {
    path: 'member',
    loadChildren: () =>
      import('./pages/member/member-page-routing.module').then(
        m => m.MemberPageRoutingModule,
      ),
  },
  {
    path: 'members',
    loadChildren: () =>
      import('./pages/members/members-page-routing.module').then(
        m => m.MembersPageRoutingModule,
      ),
  },
  {
    path: 'news',
    loadChildren: () =>
      import('./pages/news/news-page-routing.module').then(m => m.NewsPageRoutingModule),
  },
  {
    path: 'photo-gallery',
    loadChildren: () =>
      import('./pages/photo-gallery/photo-gallery-page-routing.module').then(
        m => m.PhotoGalleryPageRoutingModule,
      ),
  },
  {
    path: 'regional-clubs',
    loadChildren: () =>
      import('./pages/regional-clubs/regional-clubs-page-routing.module').then(
        m => m.RegionalClubsPageRoutingModule,
      ),
  },
  {
    path: 'schedule',
    loadChildren: () =>
      import('./pages/schedule/schedule-page-routing.module').then(
        m => m.SchedulePageRoutingModule,
      ),
  },
  {
    path: 'session-tasks/reset-password',
    loadComponent: () =>
      import('./pages/reset-password-task/reset-password-task-page.component').then(
        c => c.ResetPasswordTaskPageComponent,
      ),
  },
  {
    path: 'website-changelog',
    loadComponent: () =>
      import('./pages/website-changelog/website-changelog-page.component').then(
        c => c.WebsiteChangelogPageComponent,
      ),
  },
  {
    path: '**',
    redirectTo: '',
  },
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, {
      onSameUrlNavigation: 'reload',
    }),
  ],
  exports: [RouterModule],
})
export class AppRoutingModule {}
