import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { accessGuard } from '@app/guards/auth.guard';
import { collectionIdGuard } from '@app/guards/collection-id.guard';
import { unsavedChangesGuard } from '@app/guards/unsaved-changes.guard';

import { MemberEditorPageComponent } from './member-editor-page.component';

const routes: Routes = [
  {
    path: 'add',
    component: MemberEditorPageComponent,
    canActivate: [accessGuard],
    canDeactivate: [unsavedChangesGuard],
    data: { access: 'admin' },
  },
  {
    path: 'edit/:member_id',
    component: MemberEditorPageComponent,
    canActivate: [collectionIdGuard('member_id'), accessGuard],
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
export class MemberPageRoutingModule {}
