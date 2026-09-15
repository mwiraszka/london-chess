import { createReducer, on } from '@ngrx/store';

import { User } from '@app/models';

import * as AuthActions from './auth.actions';

export interface AuthState {
  user: User | null;
}

export const initialState: AuthState = {
  user: null,
};

export const authReducer = createReducer(
  initialState,

  on(AuthActions.userChanged, (state, { user }): AuthState => ({ ...state, user })),
);
