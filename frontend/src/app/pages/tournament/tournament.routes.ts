import { Routes } from '@angular/router';

import { accessGuard } from '@app/guards/auth.guard';
import { tournamentGuard } from '@app/guards/tournament.guard';
import { unsavedChangesGuard } from '@app/guards/unsaved-changes.guard';

import { TournamentEditorPageComponent } from './tournament-editor-page.component';

export const TOURNAMENT_ROUTES: Routes = [
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
