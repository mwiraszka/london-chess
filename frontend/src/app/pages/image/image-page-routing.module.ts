import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { AuthGuard } from '@app/guards/auth.guard';
import { collectionIdGuard } from '@app/guards/collection-id.guard';
import { UnsavedChangesGuard } from '@app/guards/unsaved-changes.guard';

import { ImageEditorPageComponent } from './image-editor-page.component';

const routes: Routes = [
  {
    path: 'add',
    component: ImageEditorPageComponent,
    canActivate: [AuthGuard],
    canDeactivate: [UnsavedChangesGuard],
  },
  {
    path: 'edit/:image_id',
    component: ImageEditorPageComponent,
    canActivate: [collectionIdGuard('image_id'), AuthGuard],
    canDeactivate: [UnsavedChangesGuard],
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
export class ImagePageRoutingModule {}
