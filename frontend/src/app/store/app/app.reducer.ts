import { createReducer, on } from '@ngrx/store';

import { DEFAULT_BRAND } from '@app/constants/brands';
import { Brand, IsoDate } from '@app/models';
import moment from '@app/utils/datetime/moment';

import * as AppActions from './app.actions';

export interface AppState {
  isDarkMode: boolean;
  isSafeMode: boolean;
  // The look the member chose on their account, kept here so a visit opens in it
  brand: Brand;
  isDesktopView: boolean;
  isWideView: boolean;
  bannerLastCleared: IsoDate | null;
  showUpcomingEventBanner: boolean;
}

export const initialState: AppState = {
  isDarkMode: window.matchMedia('(prefers-color-scheme: dark)').matches,
  isSafeMode: false,
  brand: DEFAULT_BRAND,
  isDesktopView: false,
  isWideView: false,
  bannerLastCleared: null,
  showUpcomingEventBanner: true,
};

export const appReducer = createReducer(
  initialState,

  on(AppActions.themeToggled, (state): AppState => ({
    ...state,
    isDarkMode: !state.isDarkMode,
  })),

  on(AppActions.safeModeToggled, (state): AppState => ({
    ...state,
    isSafeMode: !state.isSafeMode,
  })),

  on(AppActions.brandChanged, (state, { brand }): AppState => ({ ...state, brand })),

  on(AppActions.desktopViewToggled, (state): AppState => ({
    ...state,
    isDesktopView: !state.isDesktopView,
  })),

  on(AppActions.wideViewToggled, (state): AppState => ({
    ...state,
    isWideView: !state.isWideView,
  })),

  on(AppActions.upcomingEventBannerCleared, (state): AppState => ({
    ...state,
    showUpcomingEventBanner: false,
    bannerLastCleared: moment().toISOString(),
  })),

  on(AppActions.upcomingEventBannerReinstated, (state): AppState => ({
    ...state,
    showUpcomingEventBanner: true,
    bannerLastCleared: null,
  })),
);
