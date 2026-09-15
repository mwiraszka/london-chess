import { EntityState, createEntityAdapter } from '@ngrx/entity';
import { createReducer, on } from '@ngrx/store';
import { pick } from 'lodash';

import { EVENT_FORM_DATA_PROPERTIES, INITIAL_EVENT_FORM_DATA } from '@app/constants';
import {
  CallState,
  DataPaginationOptions,
  Event,
  EventFormData,
  IsoDate,
} from '@app/models';
import { areSame } from '@app/utils';

import * as EventsActions from './events.actions';

export interface EventsState extends EntityState<{
  event: Event;
  formData: EventFormData;
}> {
  callState: CallState;
  newEventFormData: EventFormData;
  lastFullFetch: IsoDate | null;
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
  callState: {
    status: 'idle',
    loadStart: null,
    error: null,
  },
  newEventFormData: INITIAL_EVENT_FORM_DATA,
  lastFullFetch: null,
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

export const eventsReducer = createReducer(
  initialState,

  on(
    EventsActions.fetchAllEventsRequested,
    EventsActions.fetchHomePageEventsRequested,
    EventsActions.fetchFilteredEventsRequested,
    EventsActions.fetchEventRequested,
    EventsActions.addEventRequested,
    EventsActions.updateEventRequested,
    EventsActions.deleteEventRequested,
    (state): EventsState => ({
      ...state,
      callState: {
        status: 'loading',
        loadStart: new Date().toISOString(),
        error: null,
      },
    }),
  ),

  on(
    EventsActions.fetchHomePageEventsInBackgroundRequested,
    EventsActions.fetchFilteredEventsInBackgroundRequested,
    (state): EventsState => ({
      ...state,
      callState: {
        status: 'background-loading',
        loadStart: new Date().toISOString(),
        error: null,
      },
    }),
  ),

  on(
    EventsActions.fetchAllEventsFailed,
    EventsActions.fetchHomePageEventsFailed,
    EventsActions.fetchFilteredEventsFailed,
    EventsActions.fetchEventFailed,
    EventsActions.addEventFailed,
    EventsActions.updateEventFailed,
    EventsActions.deleteEventFailed,
    (state, { error }): EventsState => ({
      ...state,
      callState: {
        status: 'error',
        loadStart: null,
        error,
      },
    }),
  ),

  on(
    EventsActions.fetchAllEventsSucceeded,
    (state, { events, totalCount }): EventsState =>
      eventsAdapter.setAll(
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
          callState: initialState.callState,
          lastFullFetch: new Date().toISOString(),
          totalCount,
        },
      ),
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
          callState: initialState.callState,
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
          callState: initialState.callState,
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
    lastFilteredFetch: null,
  })),

  on(EventsActions.fetchEventSucceeded, (state, { event }): EventsState => {
    const previousFormData = state.entities[event.id]?.formData;
    return eventsAdapter.upsertOne(
      {
        event,
        formData: previousFormData ?? pick(event, EVENT_FORM_DATA_PROPERTIES),
      },
      { ...state, callState: initialState.callState },
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
        callState: initialState.callState,
        newEventFormData: INITIAL_EVENT_FORM_DATA,
        lastFetch: null,
      },
    ),
  ),

  on(EventsActions.updateEventSucceeded, (state, { event }): EventsState =>
    eventsAdapter.upsertOne(
      {
        event,
        formData: pick(event, EVENT_FORM_DATA_PROPERTIES),
      },
      {
        ...state,
        callState: initialState.callState,
        lastFetch: null,
      },
    ),
  ),

  on(EventsActions.deleteEventSucceeded, (state, { eventId }): EventsState =>
    eventsAdapter.removeOne(eventId, {
      ...state,
      callState: initialState.callState,
      lastFetch: null,
    }),
  ),

  on(EventsActions.requestTimedOut, (state): EventsState => ({
    ...state,
    callState: {
      status: 'error',
      loadStart: null,
      error: { name: 'LCCError', message: 'Request timed out' },
    },
  })),

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
