import { createFeatureSelector, createSelector } from '@ngrx/store';

import { ApiScope } from '@app/models';
import { selectShowAdminControls } from '@app/store/app/app.selectors';

import { AuthState } from './auth.reducer';

export const selectAuthState = createFeatureSelector<AuthState>('authState');

export const selectHasAdminRights = createSelector(
  selectAuthState,
  state => !!state.user?.isAdmin,
);

// An admin with their controls switched off is treated as any other member everywhere
export const selectIsAdmin = createSelector(
  selectHasAdminRights,
  selectShowAdminControls,
  (hasAdminRights, showAdminControls) => hasAdminRights && showAdminControls,
);

export const selectApiScope = createSelector(selectIsAdmin, (isAdmin): ApiScope =>
  isAdmin ? 'admin' : 'public',
);

export const selectUser = createSelector(selectAuthState, state => state.user);
