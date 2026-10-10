import { Routes } from '@angular/router';

import { accessGuard } from '@app/guards/auth.guard';
import { unsavedChangesGuard } from '@app/guards/unsaved-changes.guard';

import { AlbumEditorPageComponent } from './album-editor-page.component';

export const ALBUM_ROUTES: Routes = [
  {
    path: 'add',
    component: AlbumEditorPageComponent,
    canActivate: [accessGuard],
    canDeactivate: [unsavedChangesGuard],
    data: { access: 'admin' },
  },
  {
    path: 'edit/:album',
    component: AlbumEditorPageComponent,
    canActivate: [accessGuard],
    canDeactivate: [unsavedChangesGuard],
    data: { access: 'admin' },
  },
  {
    path: '**',
    redirectTo: '/',
  },
];
