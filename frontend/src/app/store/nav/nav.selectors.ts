import { getRouterSelectors } from '@ngrx/router-store';
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

export const {
  selectCurrentRoute, // select the current route
  selectFragment, // select the current route fragment
  selectQueryParams, // select the current route query params
  selectQueryParam, // factory function to select a query param
  selectRouteParams, // select the current route params
  selectRouteParam, // factory function to select a route param
  selectRouteData, // select the current route data
  selectRouteDataParam, // factory function to select a route data param
  selectUrl, // select the current url
  selectTitle, // select the title if available
} = getRouterSelectors();
