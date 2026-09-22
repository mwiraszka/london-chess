import { EntityState, createEntityAdapter } from '@ngrx/entity';
import { createReducer, on } from '@ngrx/store';
import { pick } from 'lodash';

import { EVENT_FORM_DATA_PROPERTIES, INITIAL_EVENT_FORM_DATA } from '@app/constants';
import { DataPaginationOptions, Event, EventFormData, IsoDate } from '@app/models';
import { areSame } from '@app/utils';

import * as EventsActions from './events.actions';

export type EventsLoad = 'homePage' | 'filtered' | 'event';

export interface EventsState extends EntityState<{
  event: Event;
  formData: EventFormData;
}> {
  newEventFormData: EventFormData;
  // Loads whose latest attempt failed, which are never persisted
  failedLoads: EventsLoad[];
  // Whether a page of filtered events is on its way, never persisted
  isFetchingFiltered: boolean;
  lastHomePageFetch: IsoDate | null;
  lastFilteredFetch: IsoDate | null;
  homePageEvents: Event[];
  filteredEvents: Event[];
  options: DataPaginationOptions<Event>;
  filteredCount: number | null;
  totalCount: number;
  scheduleView: 'list' | 'calendar';
}

export const eventsAdapter = createEntityAdapter<{
  event: Event;
  formData: EventFormData;
}>({
  selectId: ({ event }) => event.id,
});

export const initialState: EventsState = eventsAdapter.getInitialState({
  newEventFormData: INITIAL_EVENT_FORM_DATA,
  failedLoads: [],
  isFetchingFiltered: false,
  lastHomePageFetch: null,
  lastFilteredFetch: null,
  homePageEvents: [],
  filteredEvents: [],
  options: {
    page: 1,
    pageSize: 10,
    sortBy: 'eventDate',
    sortOrder: 'asc',
    filters: {
      showPastEvents: {
        label: 'Show past events',
        value: false,
      },
    },
    search: '',
  },
  filteredCount: null,
  totalCount: 0,
  scheduleView: 'calendar',
});

function withLoadAttempt(state: EventsState, load: EventsLoad): EventsState {
  return { ...state, failedLoads: state.failedLoads.filter(failed => failed !== load) };
}

function withFailedLoad(state: EventsState, load: EventsLoad): EventsState {
  return { ...state, failedLoads: [...withLoadAttempt(state, load).failedLoads, load] };
}

export const eventsReducer = createReducer(
  initialState,

  on(EventsActions.fetchHomePageEventsRequested, (state): EventsState =>
    withLoadAttempt(state, 'homePage'),
  ),
  on(EventsActions.fetchHomePageEventsFailed, (state): EventsState =>
    withFailedLoad(state, 'homePage'),
  ),

  on(EventsActions.fetchFilteredEventsRequested, (state): EventsState => ({
    ...withLoadAttempt(state, 'filtered'),
    isFetchingFiltered: true,
  })),
  on(EventsActions.fetchFilteredEventsFailed, (state): EventsState => ({
    ...withFailedLoad(state, 'filtered'),
    isFetchingFiltered: false,
  })),

  on(EventsActions.fetchEventRequested, (state): EventsState =>
    withLoadAttempt(state, 'event'),
  ),
  on(EventsActions.fetchEventFailed, (state): EventsState =>
    withFailedLoad(state, 'event'),
  ),

  on(
    EventsActions.fetchHomePageEventsSucceeded,
    (state, { events, totalCount }): EventsState => {
      return eventsAdapter.upsertMany(
        events.map(event => {
          const existingEntity = state.entities[event.id];
          const hasUnsavedChanges =
            existingEntity?.formData &&
            !areSame(existingEntity.formData, pick(event, EVENT_FORM_DATA_PROPERTIES));

          return {
            event,
            // Preserve existing formData if there are unsaved changes
            formData: hasUnsavedChanges
              ? existingEntity.formData
              : pick(event, EVENT_FORM_DATA_PROPERTIES),
          };
        }),
        {
          ...state,
          homePageEvents: events,
          lastHomePageFetch: new Date().toISOString(),
          totalCount,
        },
      );
    },
  ),

  on(
    EventsActions.fetchFilteredEventsSucceeded,
    (state, { events, filteredCount, totalCount }): EventsState =>
      eventsAdapter.upsertMany(
        events.map(event => {
          const existingEntity = state.entities[event.id];
          const hasUnsavedChanges =
            existingEntity?.formData &&
            !areSame(existingEntity.formData, pick(event, EVENT_FORM_DATA_PROPERTIES));

          return {
            event,
            // Preserve existing formData if there are unsaved changes
            formData: hasUnsavedChanges
              ? existingEntity.formData
              : pick(event, EVENT_FORM_DATA_PROPERTIES),
          };
        }),
        {
          ...state,
          isFetchingFiltered: false,
          filteredEvents: events,
          lastFilteredFetch: new Date().toISOString(),
          filteredCount,
          totalCount,
        },
      ),
  ),

  on(EventsActions.paginationOptionsChanged, (state, { options }): EventsState => ({
    ...state,
    options,
  })),

  on(EventsActions.fetchEventSucceeded, (state, { event }): EventsState => {
    const previousFormData = state.entities[event.id]?.formData;
    return eventsAdapter.upsertOne(
      {
        event,
        formData: previousFormData ?? pick(event, EVENT_FORM_DATA_PROPERTIES),
      },
      state,
    );
  }),

  on(EventsActions.addEventSucceeded, (state, { event }): EventsState =>
    eventsAdapter.upsertOne(
      {
        event,
        formData: pick(event, EVENT_FORM_DATA_PROPERTIES),
      },
      {
        ...state,
        newEventFormData: INITIAL_EVENT_FORM_DATA,
      },
    ),
  ),

  on(EventsActions.updateEventSucceeded, (state, { event }): EventsState =>
    eventsAdapter.upsertOne(
      {
        event,
        formData: pick(event, EVENT_FORM_DATA_PROPERTIES),
      },
      state,
    ),
  ),

  on(EventsActions.deleteEventSucceeded, (state, { eventId }): EventsState =>
    eventsAdapter.removeOne(eventId, {
      ...state,
      homePageEvents: state.homePageEvents.filter(({ id }) => id !== eventId),
      filteredEvents: state.filteredEvents.filter(({ id }) => id !== eventId),
    }),
  ),

  on(EventsActions.formDataChanged, (state, { eventId, formData }): EventsState => {
    const originalEvent = eventId ? state.entities[eventId] : null;

    if (!originalEvent) {
      return {
        ...state,
        newEventFormData: {
          ...state.newEventFormData,
          ...formData,
        },
      };
    }

    return eventsAdapter.upsertOne(
      {
        ...originalEvent,
        formData: {
          ...(originalEvent?.formData ?? INITIAL_EVENT_FORM_DATA),
          ...formData,
        },
      },
      state,
    );
  }),

  on(EventsActions.formDataRestored, (state, { eventId }): EventsState => {
    const originalEvent = eventId ? state.entities[eventId]?.event : null;

    if (!originalEvent) {
      return {
        ...state,
        newEventFormData: INITIAL_EVENT_FORM_DATA,
      };
    }

    return eventsAdapter.upsertOne(
      {
        event: originalEvent,
        formData: pick(originalEvent, EVENT_FORM_DATA_PROPERTIES),
      },
      state,
    );
  }),

  on(EventsActions.toggleScheduleView, (state): EventsState => ({
    ...state,
    scheduleView: state.scheduleView === 'list' ? 'calendar' : 'list',
  })),
);
