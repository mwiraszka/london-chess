import { createAction } from '@ngrx/store';

export const upcomingEventBannerCleared = createAction(
  '[App] Upcoming event banner cleared',
);

export const upcomingEventBannerReinstated = createAction(
  '[App] Upcoming event banner reinstated',
);

export const themeToggled = createAction('[App] Theme toggled');

export const safeModeToggled = createAction('[App] Safe mode toggled');

export const desktopViewToggled = createAction('[App] Desktop view toggled');

export const wideViewToggled = createAction('[App] Wide view toggled');

export const refreshAppRequested = createAction('[App] Refresh app requested');
