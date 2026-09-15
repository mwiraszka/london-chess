import { createAction, props } from '@ngrx/store';

import { DataPaginationOptions, Event, EventFormData, Id, LccError } from '@app/models';

export const fetchAllEventsRequested = createAction(
  '[Events] Fetch all events requested',
);
export const fetchAllEventsSucceeded = createAction(
  '[Events] Fetch all events succeeded',
  props<{ events: Event[]; totalCount: number }>(),
);
export const fetchAllEventsFailed = createAction(
  '[Events] Fetch all events failed',
  props<{ error: LccError }>(),
);

export const fetchHomePageEventsRequested = createAction(
  '[Events] Fetch home page events requested',
);
export const fetchHomePageEventsInBackgroundRequested = createAction(
  '[Events] Fetch home page events in background requested',
);
export const fetchHomePageEventsSucceeded = createAction(
  '[Events] Fetch home page events succeeded',
  props<{ events: Event[]; totalCount: number }>(),
);
export const fetchHomePageEventsFailed = createAction(
  '[Events] Fetch home page events failed',
  props<{ error: LccError }>(),
);

export const fetchFilteredEventsRequested = createAction(
  '[Events] Fetch filtered events requested',
);
export const fetchFilteredEventsInBackgroundRequested = createAction(
  '[Events] Fetch filtered events in background requested',
);
export const fetchFilteredEventsSucceeded = createAction(
  '[Events] Fetch filtered events succeeded',
  props<{ events: Event[]; filteredCount: number; totalCount: number }>(),
);
export const fetchFilteredEventsFailed = createAction(
  '[Events] Fetch filtered events failed',
  props<{ error: LccError }>(),
);

export const fetchEventRequested = createAction(
  '[Events] Fetch event requested',
  props<{ eventId: Id }>(),
);
export const fetchEventSucceeded = createAction(
  '[Events] Fetch event succeeded',
  props<{ event: Event }>(),
);
export const fetchEventFailed = createAction(
  '[Events] Fetch event failed',
  props<{ error: LccError }>(),
);

export const addAnEventSelected = createAction('[Events] Add an event selected');

export const addEventRequested = createAction('[Events] Add event requested');
export const addEventSucceeded = createAction(
  '[Events] Add event succeeded',
  props<{ event: Event }>(),
);
export const addEventFailed = createAction(
  '[Events] Add event failed',
  props<{ error: LccError }>(),
);

export const updateEventRequested = createAction(
  '[Events] Update event requested',
  props<{ eventId: Id }>(),
);
export const updateEventSucceeded = createAction(
  '[Events] Update event succeeded',
  props<{ event: Event; originalEventTitle: string }>(),
);
export const updateEventFailed = createAction(
  '[Events] Update event failed',
  props<{ error: LccError }>(),
);

export const deleteEventRequested = createAction(
  '[Events] Delete event requested',
  props<{ event: Event }>(),
);
export const deleteEventSucceeded = createAction(
  '[Events] Delete event succeeded',
  props<{ eventId: Id; eventTitle: string }>(),
);
export const deleteEventFailed = createAction(
  '[Events] Delete event failed',
  props<{ error: LccError }>(),
);

export const paginationOptionsChanged = createAction(
  '[Events] Pagination options changed',
  props<{ options: DataPaginationOptions<Event>; fetch: boolean }>(),
);

export const cancelSelected = createAction('[Events] Cancel selected');

export const formDataChanged = createAction(
  '[Events] Form data changed',
  props<{ eventId: Id | null; formData: Partial<EventFormData> }>(),
);

export const formDataRestored = createAction(
  '[Events] Form data restored',
  props<{ eventId: Id | null }>(),
);

export const toggleScheduleView = createAction('[Events] Toggle schedule view');

export const exportEventsToCsvRequested = createAction(
  '[Events] Export events to CSV requested',
);
export const exportEventsToCsvSucceeded = createAction(
  '[Events] Export events to CSV succeeded',
  props<{ exportedCount: number }>(),
);
export const exportEventsToCsvFailed = createAction(
  '[Events] Export events to CSV failed',
  props<{ error: LccError }>(),
);

export const requestTimedOut = createAction('[Events] Request timed out');
