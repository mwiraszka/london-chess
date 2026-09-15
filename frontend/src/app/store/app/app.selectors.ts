import { createFeatureSelector, createSelector } from '@ngrx/store';

import * as ArticlesSelectors from '@app/store/articles/articles.selectors';
import * as EventsSelectors from '@app/store/events/events.selectors';
import * as ImagesSelectors from '@app/store/images/images.selectors';
import * as MembersSelectors from '@app/store/members/members.selectors';

import { AppState } from './app.reducer';

export const selectAppState = createFeatureSelector<AppState>('appState');

export const selectIsLoading = createSelector(
  ArticlesSelectors.selectCallState,
  EventsSelectors.selectCallState,
  ImagesSelectors.selectCallState,
  MembersSelectors.selectCallState,
  (articlesCallState, eventsCallState, imagesCallState, membersCallState) => {
    return [articlesCallState, eventsCallState, imagesCallState, membersCallState].some(
      callState => callState.status === 'loading',
    );
  },
);

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
