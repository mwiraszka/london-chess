import { createAction, props } from '@ngrx/store';

import { Brand, LccError } from '@app/models';

export const upcomingEventBannerCleared = createAction(
  '[App] Upcoming event banner cleared',
);

export const upcomingEventBannerReinstated = createAction(
  '[App] Upcoming event banner reinstated',
);

export const themeToggled = createAction('[App] Theme toggled');

export const safeModeToggled = createAction('[App] Safe mode toggled');

export const brandChanged = createAction(
  '[App] Brand changed',
  props<{ brand: Brand }>(),
);

export const desktopViewToggled = createAction('[App] Desktop view toggled');

export const wideViewToggled = createAction('[App] Wide view toggled');

export const refreshAppRequested = createAction('[App] Refresh app requested');

export const datasetCheckRequested = createAction('[App] Dataset check requested');

export const datasetReplaced = createAction('[App] Dataset replaced');

export const datasetCheckFailed = createAction(
  '[App] Dataset check failed',
  props<{ error: LccError }>(),
);
