import { Observable } from 'rxjs';

import { Entity } from './entity.model';

export interface EditorPage {
  entity: Entity;
  viewModel$?: Observable<{
    hasUnsavedChanges: boolean;
  }>;
}
