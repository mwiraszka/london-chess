import { Routes } from '@angular/router';

import { accessGuard } from '@app/guards/auth.guard';
import { HomePageComponent } from '@app/pages/home/home-page.component';

export const APP_ROUTES: Routes = [
  {
    path: '',
    // Loaded with the app rather than lazily, so the first page most visitors see
    // renders without another round trip
    component: HomePageComponent,
    pathMatch: 'full',
  },
  {
    path: 'account',
    redirectTo: 'account/profile',
    pathMatch: 'full',
  },
  {
    path: 'account/:section',
    canActivate: [accessGuard],
    data: { access: 'member' },
    loadComponent: () =>
      import('./pages/account/account-page.component').then(c => c.AccountPageComponent),
  },
  // The FAQ was the About page, which articles and bookmarks still link to
  {
    path: 'about',
    pathMatch: 'full',
    redirectTo: 'faq',
  },
  {
    path: 'album',
    loadChildren: () => import('./pages/album/album.routes').then(m => m.ALBUM_ROUTES),
    canActivate: [accessGuard],
    data: { access: 'admin' },
  },
  {
    path: 'articles',
    loadChildren: () =>
      import('./pages/articles/articles.routes').then(m => m.ARTICLES_ROUTES),
  },
  {
    path: 'article',
    loadChildren: () =>
      import('./pages/article/article.routes').then(m => m.ARTICLE_ROUTES),
  },
  // The City Championship page was the City Champion page, which articles and bookmarks
  // still link to
  {
    path: 'city-champion',
    pathMatch: 'full',
    redirectTo: 'city-championship',
  },
  {
    path: 'city-championship',
    loadChildren: () =>
      import('./pages/city-championship/city-championship.routes').then(
        m => m.CITY_CHAMPIONSHIP_ROUTES,
      ),
  },
  {
    path: 'documents',
    loadChildren: () =>
      import('./pages/documents/documents.routes').then(m => m.DOCUMENTS_ROUTES),
  },
  {
    path: 'event',
    loadChildren: () => import('./pages/event/event.routes').then(m => m.EVENT_ROUTES),
    canActivate: [accessGuard],
    data: { access: 'admin' },
  },
  {
    path: 'faq',
    loadChildren: () => import('./pages/faq/faq.routes').then(m => m.FAQ_ROUTES),
  },
  {
    path: 'game-archives',
    loadChildren: () =>
      import('./pages/game-archives/game-archives.routes').then(
        m => m.GAME_ARCHIVES_ROUTES,
      ),
  },
  {
    path: 'image',
    loadChildren: () => import('./pages/image/image.routes').then(m => m.IMAGE_ROUTES),
    canActivate: [accessGuard],
    data: { access: 'admin' },
  },
  {
    path: 'lifetime-achievement-awards',
    loadChildren: () =>
      import('./pages/lifetime/lifetime.routes').then(m => m.LIFETIME_ROUTES),
  },
  {
    path: 'member',
    loadChildren: () => import('./pages/member/member.routes').then(m => m.MEMBER_ROUTES),
  },
  {
    path: 'members',
    loadChildren: () =>
      import('./pages/members/members.routes').then(m => m.MEMBERS_ROUTES),
  },
  // Articles were the News page, which articles and bookmarks still link to
  {
    path: 'news',
    pathMatch: 'full',
    redirectTo: 'articles',
  },
  {
    path: 'photo-gallery',
    loadChildren: () =>
      import('./pages/photo-gallery/photo-gallery.routes').then(
        m => m.PHOTO_GALLERY_ROUTES,
      ),
  },
  {
    path: 'regional-clubs',
    loadChildren: () =>
      import('./pages/regional-clubs/regional-clubs.routes').then(
        m => m.REGIONAL_CLUBS_ROUTES,
      ),
  },
  {
    path: 'schedule',
    loadChildren: () =>
      import('./pages/schedule/schedule.routes').then(m => m.SCHEDULE_ROUTES),
  },
  {
    path: 'tournament',
    loadChildren: () =>
      import('./pages/tournament/tournament.routes').then(m => m.TOURNAMENT_ROUTES),
    canActivate: [accessGuard],
    data: { access: 'admin' },
  },
  {
    path: 'tournaments',
    loadChildren: () =>
      import('./pages/tournaments/tournaments.routes').then(m => m.TOURNAMENTS_ROUTES),
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
