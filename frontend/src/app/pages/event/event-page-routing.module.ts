import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { AuthGuard } from '@app/guards/auth.guard';
import { collectionIdGuard } from '@app/guards/collection-id.guard';
import { UnsavedChangesGuard } from '@app/guards/unsaved-changes.guard';

import { EventEditorPageComponent } from './event-editor-page.component';

const routes: Routes = [
  {
    path: 'add',
    component: EventEditorPageComponent,
    canActivate: [AuthGuard],
    canDeactivate: [UnsavedChangesGuard],
  },
  {
    path: 'edit/:event_id',
    component: EventEditorPageComponent,
    canActivate: [collectionIdGuard('event_id'), AuthGuard],
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
export class EventPageRoutingModule {}
