import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { AuthGuard } from '@app/guards/auth.guard';
import { collectionIdGuard } from '@app/guards/collection-id.guard';
import { UnsavedChangesGuard } from '@app/guards/unsaved-changes.guard';

import { MemberEditorPageComponent } from './member-editor-page.component';

const routes: Routes = [
  {
    path: 'add',
    component: MemberEditorPageComponent,
    canActivate: [AuthGuard],
    canDeactivate: [UnsavedChangesGuard],
  },
  {
    path: 'edit/:member_id',
    component: MemberEditorPageComponent,
    canActivate: [collectionIdGuard('member_id'), AuthGuard],
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
export class MemberPageRoutingModule {}
