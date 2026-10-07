import { EntityState, createEntityAdapter } from '@ngrx/entity';
import { createReducer, on } from '@ngrx/store';
import { isEqual, pick } from 'lodash-es';

import { EVENT_FORM_DATA_PROPERTIES, initialEventFormData } from '@app/constants';
import { CALENDAR_MONTHS_PER_PAGE } from '@app/constants/filters';
import { DataPaginationOptions, Event, EventFormData, IsoDate } from '@app/models';
import { refreshedFormData, withFailedLoad, withLoadAttempt } from '@app/utils';

import * as EventsActions from './events.actions';

export type EventsLoad = 'homePage' | 'filtered' | 'event';

export interface EventsState extends EntityState<{
  event: Event;
  formData: EventFormData;
}> {
  // Null until an admin starts a new event
  newEventFormData: EventFormData | null;
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
  calendarPage: number;
  calendarMonthsPerPage: number;
}

export const eventsAdapter = createEntityAdapter<{
  event: Event;
  formData: EventFormData;
}>({
  selectId: ({ event }) => event.id,
});

export const initialState: EventsState = eventsAdapter.getInitialState({
  newEventFormData: null,
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
  calendarPage: 1,
  calendarMonthsPerPage: CALENDAR_MONTHS_PER_PAGE[0],
});

export const eventsReducer = createReducer(
  initialState,

  on(EventsActions.fetchHomePageEventsRequested, (state): EventsState =>
    withLoadAttempt(state, 'homePage'),
  ),
  on(EventsActions.fetchHomePageEventsFailed, (state): EventsState =>
    withFailedLoad(state, 'homePage'),
  ),

  on(EventsActions.fetchFilteredEventsRequested, (state): EventsState =>
    withLoadAttempt(state, 'filtered'),
  ),
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

          return {
            event,
            formData: refreshedFormData(
              existingEntity?.formData,
              existingEntity && pick(existingEntity.event, EVENT_FORM_DATA_PROPERTIES),
              pick(event, EVENT_FORM_DATA_PROPERTIES),
            ),
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

          return {
            event,
            formData: refreshedFormData(
              existingEntity?.formData,
              existingEntity && pick(existingEntity.event, EVENT_FORM_DATA_PROPERTIES),
              pick(event, EVENT_FORM_DATA_PROPERTIES),
            ),
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

  // Only a page, filter, search or view the visitor asked for swaps the rows for
  // placeholders, so a refresh in the background leaves the ones on screen in place
  on(EventsActions.paginationOptionsChanged, (state, { options }): EventsState => ({
    ...state,
    options,
    calendarPage:
      options.search === state.options.search &&
      isEqual(options.filters, state.options.filters)
        ? state.calendarPage
        : 1,
    isFetchingFiltered: true,
  })),

  on(
    EventsActions.calendarPageChanged,
    (state, { page, monthsPerPage }): EventsState => ({
      ...state,
      calendarPage: page,
      calendarMonthsPerPage: monthsPerPage,
    }),
  ),

  on(EventsActions.fetchEventSucceeded, (state, { event }): EventsState => {
    const existingEntity = state.entities[event.id];
    return eventsAdapter.upsertOne(
      {
        event,
        formData: refreshedFormData(
          existingEntity?.formData,
          existingEntity && pick(existingEntity.event, EVENT_FORM_DATA_PROPERTIES),
          pick(event, EVENT_FORM_DATA_PROPERTIES),
        ),
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
        newEventFormData: null,
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
          ...(state.newEventFormData ?? initialEventFormData()),
          ...formData,
        },
      };
    }

    return eventsAdapter.upsertOne(
      {
        ...originalEvent,
        formData: {
          ...originalEvent.formData,
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
        newEventFormData: null,
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
    isFetchingFiltered: true,
  })),
);
