import { INITIAL_EVENT_FORM_DATA } from '@app/constants';
import { MOCK_EVENTS } from '@app/mocks/events.mock';
import { LccError } from '@app/models';

import * as EventsActions from './events.actions';
import {
  EventsState,
  eventsAdapter,
  eventsReducer,
  initialState,
} from './events.reducer';

describe('Events Reducer', () => {
  const mockError: LccError = {
    name: 'LCCError',
    message: 'Something went wrong',
  };

  describe('unknown action', () => {
    it('should return the default state', () => {
      const action = { type: 'Unknown' };
      const state = eventsReducer(initialState, action);

      expect(state).toBe(initialState);
    });
  });

  describe('initialState', () => {
    it('should have the correct initial state', () => {
      expect(initialState).toEqual({
        ids: [],
        entities: {},
        callState: {
          status: 'idle',
          error: null,
          loadStart: null,
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
    });
  });

  describe('loading states', () => {
    it('should set loading state on fetchAllEventsRequested', () => {
      const action = EventsActions.fetchAllEventsRequested();
      const state = eventsReducer(initialState, action);

      expect(state.callState.status).toBe('loading');
      expect(state.callState.loadStart).toBeTruthy();
      expect(state.callState.error).toBeNull();
    });

    it('should set loading state on fetchHomePageEventsRequested', () => {
      const action = EventsActions.fetchHomePageEventsRequested();
      const state = eventsReducer(initialState, action);

      expect(state.callState.status).toBe('loading');
    });

    it('should set loading state on fetchFilteredEventsRequested', () => {
      const action = EventsActions.fetchFilteredEventsRequested();
      const state = eventsReducer(initialState, action);

      expect(state.callState.status).toBe('loading');
    });

    it('should set loading state on fetchEventRequested', () => {
      const action = EventsActions.fetchEventRequested({ eventId: '1' });
      const state = eventsReducer(initialState, action);

      expect(state.callState.status).toBe('loading');
    });

    it('should set loading state on addEventRequested', () => {
      const action = EventsActions.addEventRequested();
      const state = eventsReducer(initialState, action);

      expect(state.callState.status).toBe('loading');
    });

    it('should set loading state on updateEventRequested', () => {
      const action = EventsActions.updateEventRequested({ eventId: '1' });
      const state = eventsReducer(initialState, action);

      expect(state.callState.status).toBe('loading');
    });

    it('should set loading state on deleteEventRequested', () => {
      const action = EventsActions.deleteEventRequested({ event: MOCK_EVENTS[0] });
      const state = eventsReducer(initialState, action);

      expect(state.callState.status).toBe('loading');
    });
  });

  describe('background loading states', () => {
    it('should set background-loading state on fetchHomePageEventsInBackgroundRequested', () => {
      const action = EventsActions.fetchHomePageEventsInBackgroundRequested();
      const state = eventsReducer(initialState, action);

      expect(state.callState.status).toBe('background-loading');
      expect(state.callState.loadStart).toBeTruthy();
    });

    it('should set background-loading state on fetchFilteredEventsInBackgroundRequested', () => {
      const action = EventsActions.fetchFilteredEventsInBackgroundRequested();
      const state = eventsReducer(initialState, action);

      expect(state.callState.status).toBe('background-loading');
    });
  });

  describe('error states', () => {
    it('should set error state on fetchAllEventsFailed', () => {
      const action = EventsActions.fetchAllEventsFailed({ error: mockError });
      const state = eventsReducer(initialState, action);

      expect(state.callState.status).toBe('error');
      expect(state.callState.error).toEqual(mockError);
      expect(state.callState.loadStart).toBeNull();
    });

    it('should set error state on fetchHomePageEventsFailed', () => {
      const action = EventsActions.fetchHomePageEventsFailed({ error: mockError });
      const state = eventsReducer(initialState, action);

      expect(state.callState.status).toBe('error');
    });

    it('should set error state on fetchFilteredEventsFailed', () => {
      const action = EventsActions.fetchFilteredEventsFailed({ error: mockError });
      const state = eventsReducer(initialState, action);

      expect(state.callState.status).toBe('error');
    });

    it('should set error state on fetchEventFailed', () => {
      const action = EventsActions.fetchEventFailed({ error: mockError });
      const state = eventsReducer(initialState, action);

      expect(state.callState.status).toBe('error');
    });

    it('should set error state on addEventFailed', () => {
      const action = EventsActions.addEventFailed({ error: mockError });
      const state = eventsReducer(initialState, action);

      expect(state.callState.status).toBe('error');
    });

    it('should set error state on updateEventFailed', () => {
      const action = EventsActions.updateEventFailed({ error: mockError });
      const state = eventsReducer(initialState, action);

      expect(state.callState.status).toBe('error');
    });

    it('should set error state on deleteEventFailed', () => {
      const action = EventsActions.deleteEventFailed({ error: mockError });
      const state = eventsReducer(initialState, action);

      expect(state.callState.status).toBe('error');
    });
  });

  describe('fetchAllEventsSucceeded', () => {
    it('should replace all events in state', () => {
      const events = [MOCK_EVENTS[0], MOCK_EVENTS[1]];
      const action = EventsActions.fetchAllEventsSucceeded({
        events,
        totalCount: 2,
      });
      const state = eventsReducer(initialState, action);

      expect(state.ids.length).toBe(2);
      expect(state.entities['f6a7b8c9d0e1f2a3']?.event).toEqual(MOCK_EVENTS[0]);
      expect(state.entities['a7b8c9d0e1f2a3b4']?.event).toEqual(MOCK_EVENTS[1]);
      expect(state.totalCount).toBe(2);
      expect(state.lastFullFetch).toBeTruthy();
    });

    it('should reset callState to idle', () => {
      const previousState: EventsState = {
        ...initialState,
        callState: {
          status: 'loading',
          loadStart: new Date().toISOString(),
          error: null,
        },
      };

      const action = EventsActions.fetchAllEventsSucceeded({
        events: [MOCK_EVENTS[0]],
        totalCount: 1,
      });
      const state = eventsReducer(previousState, action);

      expect(state.callState.status).toBe('idle');
      expect(state.callState.error).toBeNull();
    });

    it('should preserve formData with unsaved changes', () => {
      const modifiedFormData = {
        type: 'rapid tournament (25 mins)' as const,
        eventDate: '2025-07-01T18:00:00.000Z',
        title: 'Modified Title',
        details: 'Modified Details',
        articleId: 'article999',
      };

      const previousState: EventsState = eventsAdapter.upsertOne(
        {
          event: MOCK_EVENTS[0],
          formData: modifiedFormData,
        },
        initialState,
      );

      const updatedEvent = { ...MOCK_EVENTS[0], title: 'Updated from server' };
      const action = EventsActions.fetchAllEventsSucceeded({
        events: [updatedEvent],
        totalCount: 1,
      });
      const state = eventsReducer(previousState, action);

      expect(state.entities['f6a7b8c9d0e1f2a3']?.formData).toEqual(modifiedFormData);
      expect(state.entities['f6a7b8c9d0e1f2a3']?.event).toEqual(updatedEvent);
    });
  });

  describe('fetchHomePageEventsSucceeded', () => {
    it('should upsert events and update homePageEvents', () => {
      const events = [MOCK_EVENTS[0]];
      const action = EventsActions.fetchHomePageEventsSucceeded({
        events,
        totalCount: 1,
      });
      const state = eventsReducer(initialState, action);

      expect(state.entities['f6a7b8c9d0e1f2a3']?.event).toEqual(MOCK_EVENTS[0]);
      expect(state.homePageEvents).toEqual(events);
      expect(state.totalCount).toBe(1);
      expect(state.lastHomePageFetch).toBeTruthy();
    });
  });

  describe('fetchFilteredEventsSucceeded', () => {
    it('should upsert events and update filteredEvents', () => {
      const events = [MOCK_EVENTS[0]];
      const action = EventsActions.fetchFilteredEventsSucceeded({
        events,
        filteredCount: 1,
        totalCount: 10,
      });
      const state = eventsReducer(initialState, action);

      expect(state.entities['f6a7b8c9d0e1f2a3']?.event).toEqual(MOCK_EVENTS[0]);
      expect(state.filteredEvents).toEqual(events);
      expect(state.filteredCount).toBe(1);
      expect(state.totalCount).toBe(10);
      expect(state.lastFilteredFetch).toBeTruthy();
    });
  });

  describe('paginationOptionsChanged', () => {
    it('should update pagination options', () => {
      const newOptions = {
        ...initialState.options,
        page: 2,
        pageSize: 20,
      };

      const action = EventsActions.paginationOptionsChanged({
        options: newOptions,
        fetch: false,
      });
      const state = eventsReducer(initialState, action);

      expect(state.options.page).toBe(2);
      expect(state.options.pageSize).toBe(20);
    });

    it('should reset lastFilteredFetch', () => {
      const previousState: EventsState = {
        ...initialState,
        lastFilteredFetch: '2025-01-01T00:00:00.000Z',
      };

      const action = EventsActions.paginationOptionsChanged({
        options: { ...initialState.options, page: 2 },
        fetch: false,
      });
      const state = eventsReducer(previousState, action);

      expect(state.lastFilteredFetch).toBeNull();
    });
  });

  describe('fetchEventSucceeded', () => {
    it('should add event to state', () => {
      const action = EventsActions.fetchEventSucceeded({ event: MOCK_EVENTS[0] });
      const state = eventsReducer(initialState, action);

      expect(state.entities['f6a7b8c9d0e1f2a3']?.event).toEqual(MOCK_EVENTS[0]);
      expect(state.callState.status).toBe('idle');
    });

    it('should preserve existing formData', () => {
      const existingFormData = {
        type: 'lecture' as const,
        eventDate: '2025-06-15T18:00:00.000Z',
        title: 'Existing Title',
        details: 'Existing Details',
        articleId: 'article1',
      };

      const previousState: EventsState = eventsAdapter.upsertOne(
        {
          event: MOCK_EVENTS[0],
          formData: existingFormData,
        },
        initialState,
      );

      const action = EventsActions.fetchEventSucceeded({ event: MOCK_EVENTS[0] });
      const state = eventsReducer(previousState, action);

      expect(state.entities['f6a7b8c9d0e1f2a3']?.formData).toEqual(existingFormData);
    });
  });

  describe('addEventSucceeded', () => {
    it('should add new event to state', () => {
      const action = EventsActions.addEventSucceeded({ event: MOCK_EVENTS[0] });
      const state = eventsReducer(initialState, action);

      expect(state.entities['f6a7b8c9d0e1f2a3']?.event).toEqual(MOCK_EVENTS[0]);
      expect(state.callState.status).toBe('idle');
    });

    it('should reset newEventFormData', () => {
      const previousState: EventsState = {
        ...initialState,
        newEventFormData: {
          type: 'simul',
          eventDate: '2025-07-01T18:00:00.000Z',
          title: 'Draft Event',
          details: 'Draft Details',
          articleId: 'article1',
        },
      };

      const action = EventsActions.addEventSucceeded({ event: MOCK_EVENTS[0] });
      const state = eventsReducer(previousState, action);

      expect(state.newEventFormData).toEqual(INITIAL_EVENT_FORM_DATA);
    });
  });

  describe('updateEventSucceeded', () => {
    it('should update existing event', () => {
      const previousState: EventsState = eventsAdapter.upsertOne(
        {
          event: MOCK_EVENTS[0],
          formData: {
            type: MOCK_EVENTS[0].type,
            eventDate: MOCK_EVENTS[0].eventDate,
            title: MOCK_EVENTS[0].title,
            details: MOCK_EVENTS[0].details,
            articleId: MOCK_EVENTS[0].articleId,
          },
        },
        initialState,
      );

      const updatedEvent = { ...MOCK_EVENTS[0], title: 'Updated Title' };
      const action = EventsActions.updateEventSucceeded({
        event: updatedEvent,
        originalEventTitle: 'Summer Blitz Tournament',
      });
      const state = eventsReducer(previousState, action);

      expect(state.entities['f6a7b8c9d0e1f2a3']?.event.title).toBe('Updated Title');
      expect(state.callState.status).toBe('idle');
    });

    it('should update formData to match event', () => {
      const previousState: EventsState = eventsAdapter.upsertOne(
        {
          event: MOCK_EVENTS[0],
          formData: {
            type: 'lecture',
            eventDate: MOCK_EVENTS[0].eventDate,
            title: 'Old Title',
            details: 'Old Details',
            articleId: '',
          },
        },
        initialState,
      );

      const updatedEvent = { ...MOCK_EVENTS[0], title: 'New Title' };
      const action = EventsActions.updateEventSucceeded({
        event: updatedEvent,
        originalEventTitle: 'Old Title',
      });
      const state = eventsReducer(previousState, action);

      expect(state.entities['f6a7b8c9d0e1f2a3']?.formData.title).toBe('New Title');
    });
  });

  describe('deleteEventSucceeded', () => {
    it('should remove event from state', () => {
      const previousState: EventsState = eventsAdapter.upsertOne(
        {
          event: MOCK_EVENTS[0],
          formData: {
            type: MOCK_EVENTS[0].type,
            eventDate: MOCK_EVENTS[0].eventDate,
            title: MOCK_EVENTS[0].title,
            details: MOCK_EVENTS[0].details,
            articleId: MOCK_EVENTS[0].articleId,
          },
        },
        initialState,
      );

      const action = EventsActions.deleteEventSucceeded({
        eventId: MOCK_EVENTS[0].id,
        eventTitle: MOCK_EVENTS[0].title,
      });
      const state = eventsReducer(previousState, action);

      expect(state.entities['f6a7b8c9d0e1f2a3']).toBeUndefined();
      expect(state.ids.length).toBe(0);
      expect(state.callState.status).toBe('idle');
    });
  });

  describe('toggleScheduleView', () => {
    it('should toggle from calendar to list', () => {
      const previousState: EventsState = {
        ...initialState,
        scheduleView: 'calendar',
      };

      const action = EventsActions.toggleScheduleView();
      const state = eventsReducer(previousState, action);

      expect(state.scheduleView).toBe('list');
    });

    it('should toggle from list to calendar', () => {
      const previousState: EventsState = {
        ...initialState,
        scheduleView: 'list',
      };

      const action = EventsActions.toggleScheduleView();
      const state = eventsReducer(previousState, action);

      expect(state.scheduleView).toBe('calendar');
    });
  });

  describe('formDataChanged', () => {
    it('should update newEventFormData when eventId is null', () => {
      const formData = { title: 'New Title' };
      const action = EventsActions.formDataChanged({ eventId: null, formData });
      const state = eventsReducer(initialState, action);

      expect(state.newEventFormData.title).toBe('New Title');
    });

    it('should update existing event formData', () => {
      const previousState: EventsState = eventsAdapter.upsertOne(
        {
          event: MOCK_EVENTS[0],
          formData: {
            type: MOCK_EVENTS[0].type,
            eventDate: MOCK_EVENTS[0].eventDate,
            title: MOCK_EVENTS[0].title,
            details: MOCK_EVENTS[0].details,
            articleId: MOCK_EVENTS[0].articleId,
          },
        },
        initialState,
      );

      const formData = { title: 'Modified Title' };
      const action = EventsActions.formDataChanged({
        eventId: MOCK_EVENTS[0].id,
        formData,
      });
      const state = eventsReducer(previousState, action);

      expect(state.entities['f6a7b8c9d0e1f2a3']?.formData.title).toBe('Modified Title');
      expect(state.entities['f6a7b8c9d0e1f2a3']?.formData.details).toBe(
        MOCK_EVENTS[0].details,
      );
    });
  });

  describe('formDataRestored', () => {
    it('should reset newEventFormData when eventId is null', () => {
      const previousState: EventsState = {
        ...initialState,
        newEventFormData: {
          type: 'championship',
          eventDate: '2025-07-01T18:00:00.000Z',
          title: 'Draft Event',
          details: 'Draft Details',
          articleId: 'article1',
        },
      };

      const action = EventsActions.formDataRestored({ eventId: null });
      const state = eventsReducer(previousState, action);

      expect(state.newEventFormData).toEqual(INITIAL_EVENT_FORM_DATA);
    });

    it('should restore event formData from original event', () => {
      const previousState: EventsState = eventsAdapter.upsertOne(
        {
          event: MOCK_EVENTS[0],
          formData: {
            type: 'other',
            eventDate: '2025-07-01T18:00:00.000Z',
            title: 'Modified Title',
            details: 'Modified Details',
            articleId: 'article999',
          },
        },
        initialState,
      );

      const action = EventsActions.formDataRestored({ eventId: MOCK_EVENTS[0].id });
      const state = eventsReducer(previousState, action);

      expect(state.entities['f6a7b8c9d0e1f2a3']?.formData).toEqual({
        type: MOCK_EVENTS[0].type,
        eventDate: MOCK_EVENTS[0].eventDate,
        title: MOCK_EVENTS[0].title,
        details: MOCK_EVENTS[0].details,
        articleId: MOCK_EVENTS[0].articleId,
      });
    });
  });

  describe('requestTimedOut', () => {
    it('should set timeout error', () => {
      const action = EventsActions.requestTimedOut();
      const state = eventsReducer(initialState, action);

      expect(state.callState.status).toBe('error');
      expect(state.callState.error).toEqual({
        name: 'LCCError',
        message: 'Request timed out',
      });
    });
  });

  describe('state immutability', () => {
    it('should not mutate the previous state', () => {
      const previousState: EventsState = { ...initialState };
      const originalState = { ...previousState };

      const action = EventsActions.fetchAllEventsRequested();
      const state = eventsReducer(previousState, action);

      expect(previousState).toEqual(originalState);
      expect(state).not.toBe(previousState);
    });
  });
});
