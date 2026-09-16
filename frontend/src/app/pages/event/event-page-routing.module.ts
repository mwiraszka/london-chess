import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { accessGuard } from '@app/guards/auth.guard';
import { collectionIdGuard } from '@app/guards/collection-id.guard';
import { unsavedChangesGuard } from '@app/guards/unsaved-changes.guard';

import { EventEditorPageComponent } from './event-editor-page.component';

const routes: Routes = [
  {
    path: 'add',
    component: EventEditorPageComponent,
    canActivate: [accessGuard],
    canDeactivate: [unsavedChangesGuard],
    data: { access: 'admin' },
  },
  {
    path: 'edit/:event_id',
    component: EventEditorPageComponent,
    canActivate: [collectionIdGuard('event_id'), accessGuard],
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
export class EventPageRoutingModule {}
