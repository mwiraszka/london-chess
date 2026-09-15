import { createReducer, on } from '@ngrx/store';

import * as navActions from './nav.actions';

export interface NavState {
  pathHistory: string[];
}

export const initialState: NavState = {
  pathHistory: [],
};

export const navReducer = createReducer(
  initialState,

  on(navActions.appendPathToHistory, (state, { path }): NavState => ({
    pathHistory:
      state.pathHistory.length > 0 &&
      state.pathHistory[state.pathHistory.length - 1] === path
        ? state.pathHistory
        : [...state.pathHistory, path].slice(-5),
  })),
);
