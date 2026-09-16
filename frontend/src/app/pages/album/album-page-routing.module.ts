import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { accessGuard } from '@app/guards/auth.guard';
import { unsavedChangesGuard } from '@app/guards/unsaved-changes.guard';

import { AlbumEditorPageComponent } from './album-editor-page.component';

const routes: Routes = [
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

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AlbumPageRoutingModule {}
