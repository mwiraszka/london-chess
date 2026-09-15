import { createAction, props } from '@ngrx/store';

import { User } from '@app/models';

export const userChanged = createAction(
  '[Auth] User changed',
  props<{ user: User | null }>(),
);
