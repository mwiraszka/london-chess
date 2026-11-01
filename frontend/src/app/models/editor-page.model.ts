import { Observable } from 'rxjs';

import { Signal } from '@angular/core';

import { Entity } from './entity.model';

export interface EditorPage {
  entity: Entity;
  viewModel$?: Observable<{
    hasUnsavedChanges: boolean;
  }>;
}

// A page whose changes are lost on leaving it, as no draft keeps them
export interface UnsavedChangesPage {
  hasUnsavedChanges: Signal<boolean>;
}
