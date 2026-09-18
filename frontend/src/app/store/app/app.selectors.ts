import { createFeatureSelector, createSelector } from '@ngrx/store';

import { AppState } from './app.reducer';

export const selectAppState = createFeatureSelector<AppState>('appState');

export const selectIsDarkMode = createSelector(selectAppState, state => state.isDarkMode);

export const selectIsSafeMode = createSelector(selectAppState, state => state.isSafeMode);

export const selectIsDesktopView = createSelector(
  selectAppState,
  state => state.isDesktopView,
);

export const selectIsWideView = createSelector(selectAppState, state => state.isWideView);

export const selectShowUpcomingEventBanner = createSelector(
  selectAppState,
  state => state.showUpcomingEventBanner,
);

export const selectBannerLastCleared = createSelector(
  selectAppState,
  state => state.bannerLastCleared,
);
