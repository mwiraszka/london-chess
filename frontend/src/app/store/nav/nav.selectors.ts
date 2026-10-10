import { createFeatureSelector, createSelector } from '@ngrx/store';

import { NavState } from './nav.reducer';

export const selectNavState = createFeatureSelector<NavState>('navState');

export const selectPathHistory = createSelector(
  selectNavState,
  state => state.pathHistory,
);

export const selectCurrentPath = createSelector(selectPathHistory, pathHistory =>
  pathHistory.length ? pathHistory[pathHistory.length - 1] : null,
);
