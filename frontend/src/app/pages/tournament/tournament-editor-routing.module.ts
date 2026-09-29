import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { accessGuard } from '@app/guards/auth.guard';
import { tournamentGuard } from '@app/guards/tournament.guard';
import { unsavedChangesGuard } from '@app/guards/unsaved-changes.guard';

import { TournamentEditorPageComponent } from './tournament-editor-page.component';

const routes: Routes = [
  {
    path: 'add',
    component: TournamentEditorPageComponent,
    canActivate: [accessGuard],
    canDeactivate: [unsavedChangesGuard],
    data: { access: 'admin' },
  },
  {
    path: 'edit/:number',
    component: TournamentEditorPageComponent,
    canActivate: [accessGuard, tournamentGuard('number')],
    canDeactivate: [unsavedChangesGuard],
    data: { access: 'admin' },
  },
  {
    path: '**',
    redirectTo: '/tournaments',
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class TournamentEditorRoutingModule {}
