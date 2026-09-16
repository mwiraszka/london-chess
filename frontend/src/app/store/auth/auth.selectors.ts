import { createFeatureSelector, createSelector } from '@ngrx/store';

import { ApiScope } from '@app/models';

import { AuthState } from './auth.reducer';

export const selectAuthState = createFeatureSelector<AuthState>('authState');

export const selectIsAdmin = createSelector(
  selectAuthState,
  state => !!state.user?.isAdmin,
);

export const selectApiScope = createSelector(selectIsAdmin, (isAdmin): ApiScope =>
  isAdmin ? 'admin' : 'public',
);

export const selectUser = createSelector(selectAuthState, state => state.user);

export const selectUserId = createSelector(selectUser, user => user?.id);
