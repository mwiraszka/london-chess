import { createAction, props } from '@ngrx/store';

import { LccError, Toast } from '@app/models';

export const upcomingEventBannerCleared = createAction(
  '[App] Upcoming event banner cleared',
);

export const upcomingEventBannerReinstated = createAction(
  '[App] Reinstate upcoming event banner reinstated',
);

export const themeToggled = createAction('[App] Theme toggled');

export const safeModeToggled = createAction('[App] Safe mode toggled');

export const desktopViewToggled = createAction('[App] Desktop view toggled');

export const wideViewToggled = createAction('[App] Wide view toggled');

export const toastDisplayed = createAction(
  '[App] Toast displayed',
  props<{ toast: Toast }>(),
);

export const unexpectedErrorOccurred = createAction(
  '[App] Unexpected error occurred',
  props<{ error: LccError }>(),
);

export const refreshAppRequested = createAction('[App] Refresh app requested');
