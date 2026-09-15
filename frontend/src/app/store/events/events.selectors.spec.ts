import moment from 'moment-timezone';

import { INITIAL_EVENT_FORM_DATA } from '@app/constants';
import { MOCK_EVENTS } from '@app/mocks/events.mock';
import { CallState, DataPaginationOptions, Event, EventFormData } from '@app/models';

import { EventsState, eventsAdapter } from './events.reducer';
import * as EventsSelectors from './events.selectors';

describe('Events Selectors', () => {
  const mockCallState: CallState = {
    status: 'idle',
    error: null,
    loadStart: null,
  };

  const mockOptions: DataPaginationOptions<Event> = {
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
  };

  const mockEventFormData: EventFormData = {
    type: 'blitz tournament (10 mins)',
    title: 'Test Event',
    eventDate: moment('2050-05-01').toISOString(),
    details: 'Test details',
    articleId: '',
  };

  const mockEventsState: EventsState = {
    ...eventsAdapter.getInitialState({
      callState: mockCallState,
      newEventFormData: INITIAL_EVENT_FORM_DATA,
      lastFullFetch: '2025-01-15T10:00:00.000Z',
      lastHomePageFetch: '2025-01-15T10:00:00.000Z',
      lastFilteredFetch: '2025-01-14T12:00:00.000Z',
      homePageEvents: [MOCK_EVENTS[0], MOCK_EVENTS[1]],
      filteredEvents: [MOCK_EVENTS[2], MOCK_EVENTS[3]],
      options: mockOptions,
      filteredCount: 12,
      totalCount: 20,
      scheduleView: 'calendar',
    }),
    entities: {
      [MOCK_EVENTS[0].id]: {
        event: MOCK_EVENTS[0],
        formData: mockEventFormData,
      },
      [MOCK_EVENTS[1].id]: {
        event: MOCK_EVENTS[1],
        formData: INITIAL_EVENT_FORM_DATA,
      },
    },
    ids: [MOCK_EVENTS[0].id, MOCK_EVENTS[1].id],
  };

  describe('selectCallState', () => {
    it('should select the call state', () => {
      const result = EventsSelectors.selectCallState.projector(mockEventsState);
      expect(result).toEqual(mockCallState);
    });
  });

  describe('selectLastFullFetch', () => {
    it('should select the last full fetch timestamp', () => {
      const result = EventsSelectors.selectLastFullFetch.projector(mockEventsState);
      expect(result).toBe('2025-01-15T10:00:00.000Z');
    });
  });

  describe('selectLastHomePageFetch', () => {
    it('should select the last home page fetch timestamp', () => {
      const result = EventsSelectors.selectLastHomePageFetch.projector(mockEventsState);
      expect(result).toBe('2025-01-15T10:00:00.000Z');
    });
  });

  describe('selectLastFilteredFetch', () => {
    it('should select the last filtered fetch timestamp', () => {
      const result = EventsSelectors.selectLastFilteredFetch.projector(mockEventsState);
      expect(result).toBe('2025-01-14T12:00:00.000Z');
    });
  });

  describe('selectHomePageEvents', () => {
    it('should select the home page events', () => {
      const result = EventsSelectors.selectHomePageEvents.projector(mockEventsState);
      expect(result).toEqual([MOCK_EVENTS[0], MOCK_EVENTS[1]]);
    });
  });

  describe('selectFilteredEvents', () => {
    it('should select the filtered events', () => {
      const result = EventsSelectors.selectFilteredEvents.projector(mockEventsState);
      expect(result).toEqual([MOCK_EVENTS[2], MOCK_EVENTS[3]]);
    });
  });

  describe('selectOptions', () => {
    it('should select the data pagination options', () => {
      const result = EventsSelectors.selectOptions.projector(mockEventsState);
      expect(result).toEqual(mockOptions);
    });
  });

  describe('selectFilteredCount', () => {
    it('should select the filtered count', () => {
      const result = EventsSelectors.selectFilteredCount.projector(mockEventsState);
      expect(result).toBe(12);
    });
  });

  describe('selectTotalCount', () => {
    it('should select the total count', () => {
      const result = EventsSelectors.selectTotalCount.projector(mockEventsState);
      expect(result).toBe(20);
    });
  });

  describe('selectScheduleView', () => {
    it('should select the schedule view', () => {
      const result = EventsSelectors.selectScheduleView.projector(mockEventsState);
      expect(result).toBe('calendar');
    });
  });

  describe('selectAllEvents', () => {
    it('should select all events from entities', () => {
      const allEventEntities = [
        { event: MOCK_EVENTS[0], formData: mockEventFormData },
        { event: MOCK_EVENTS[1], formData: INITIAL_EVENT_FORM_DATA },
      ];
      const result = EventsSelectors.selectAllEvents.projector(allEventEntities);
      expect(result).toEqual([MOCK_EVENTS[0], MOCK_EVENTS[1]]);
    });
  });

  describe('selectEventById', () => {
    it('should select event by id when it exists', () => {
      const allEventEntities = [
        { event: MOCK_EVENTS[0], formData: mockEventFormData },
        { event: MOCK_EVENTS[1], formData: INITIAL_EVENT_FORM_DATA },
      ];
      const selector = EventsSelectors.selectEventById(MOCK_EVENTS[1].id);
      const result = selector.projector(allEventEntities);
      expect(result).toEqual(MOCK_EVENTS[1]);
    });

    it('should return null when event id does not exist', () => {
      const allEventEntities = [{ event: MOCK_EVENTS[0], formData: mockEventFormData }];
      const selector = EventsSelectors.selectEventById('non-existent-id');
      const result = selector.projector(allEventEntities);
      expect(result).toBeNull();
    });

    it('should return null when id is null', () => {
      const allEventEntities = [{ event: MOCK_EVENTS[0], formData: mockEventFormData }];
      const selector = EventsSelectors.selectEventById(null);
      const result = selector.projector(allEventEntities);
      expect(result).toBeNull();
    });
  });

  describe('selectEventFormDataById', () => {
    it('should select form data for existing event', () => {
      const allEventEntities = [{ event: MOCK_EVENTS[0], formData: mockEventFormData }];
      const selector = EventsSelectors.selectEventFormDataById(MOCK_EVENTS[0].id);
      const result = selector.projector(mockEventsState, allEventEntities);
      expect(result).toEqual(mockEventFormData);
    });

    it('should return newEventFormData when event id is null', () => {
      const allEventEntities = [{ event: MOCK_EVENTS[0], formData: mockEventFormData }];
      const selector = EventsSelectors.selectEventFormDataById(null);
      const result = selector.projector(mockEventsState, allEventEntities);
      expect(result).toEqual(INITIAL_EVENT_FORM_DATA);
    });
  });

  describe('selectHasUnsavedChanges', () => {
    it('should return false when event and form data are the same', () => {
      const event: Event = {
        ...MOCK_EVENTS[0],
        title: 'Same Title',
        details: 'Same Details',
      };
      const formData: EventFormData = {
        type: event.type,
        title: 'Same Title',
        eventDate: event.eventDate,
        details: 'Same Details',
        articleId: event.articleId,
      };
      const selector = EventsSelectors.selectHasUnsavedChanges(event.id);
      const result = selector.projector(event, formData);
      expect(result).toBe(false);
    });

    it('should return true when title has changed', () => {
      const event: Event = {
        ...MOCK_EVENTS[0],
        title: 'Original Title',
      };
      const formData: EventFormData = {
        type: event.type,
        title: 'Modified Title',
        eventDate: event.eventDate,
        details: event.details,
        articleId: event.articleId,
      };
      const selector = EventsSelectors.selectHasUnsavedChanges(event.id);
      const result = selector.projector(event, formData);
      expect(result).toBe(true);
    });
  });

  describe('selectConcurrentNextEvents', () => {
    it('should return all upcoming events with the same eventDate as the next event', () => {
      const now = moment.tz('America/Toronto');
      const sharedDate = now.clone().add(1, 'day').toISOString();
      const events = [
        { ...MOCK_EVENTS[0], eventDate: sharedDate },
        { ...MOCK_EVENTS[1], eventDate: sharedDate },
        { ...MOCK_EVENTS[2], eventDate: now.clone().add(2, 'days').toISOString() },
      ];

      const result = EventsSelectors.selectConcurrentNextEvents.projector(events);

      expect(result.length).toBe(2);
      expect(result[0].id).toBe(MOCK_EVENTS[0].id);
      expect(result[1].id).toBe(MOCK_EVENTS[1].id);
    });

    it('should return a single event when no other events share the same date and time', () => {
      const now = moment.tz('America/Toronto');
      const events = [
        { ...MOCK_EVENTS[0], eventDate: now.clone().add(1, 'day').toISOString() },
        { ...MOCK_EVENTS[1], eventDate: now.clone().add(2, 'days').toISOString() },
      ];

      const result = EventsSelectors.selectConcurrentNextEvents.projector(events);

      expect(result.length).toBe(1);
      expect(result[0].id).toBe(MOCK_EVENTS[0].id);
    });

    it('should return empty array when there are no upcoming events', () => {
      const pastEvents = [
        { ...MOCK_EVENTS[0], eventDate: moment().subtract(1, 'day').toISOString() },
      ];

      const result = EventsSelectors.selectConcurrentNextEvents.projector(pastEvents);

      expect(result).toEqual([]);
    });

    it('should ignore a cached event that is no longer among the home page events', () => {
      const deletedEvent: Event = {
        ...MOCK_EVENTS[2],
        id: 'deleted-event-id',
        eventDate: moment('2049-12-01').toISOString(),
      };
      const state = eventsAdapter.upsertOne(
        { event: deletedEvent, formData: INITIAL_EVENT_FORM_DATA },
        mockEventsState,
      );

      const result = EventsSelectors.selectConcurrentNextEvents({ eventsState: state });

      expect(result).toEqual([MOCK_EVENTS[0]]);
    });
  });

  describe('selectNextEvent', () => {
    it('should select the next upcoming event', () => {
      const now = moment.tz('America/Toronto');
      const futureEvents = [
        {
          ...MOCK_EVENTS[0],
          eventDate: now.clone().add(1, 'day').toISOString(),
        },
        {
          ...MOCK_EVENTS[1],
          eventDate: now.clone().add(2, 'days').toISOString(),
        },
        {
          ...MOCK_EVENTS[2],
          eventDate: now.clone().add(3, 'days').toISOString(),
        },
      ];
      const result = EventsSelectors.selectNextEvent.projector(futureEvents);
      expect(result?.id).toBe(MOCK_EVENTS[0].id);
    });

    it('should return null when no future events', () => {
      const pastEvents = [
        {
          ...MOCK_EVENTS[0],
          eventDate: moment().subtract(1, 'day').toISOString(),
        },
      ];
      const result = EventsSelectors.selectNextEvent.projector(pastEvents);
      expect(result).toBeNull();
    });

    it('should exclude events that ended more than 3 hours ago', () => {
      const now = moment.tz('America/Toronto');
      const events = [
        {
          ...MOCK_EVENTS[0],
          eventDate: now.clone().subtract(4, 'hours').toISOString(),
        },
        {
          ...MOCK_EVENTS[1],
          eventDate: now.clone().add(1, 'day').toISOString(),
        },
      ];
      const result = EventsSelectors.selectNextEvent.projector(events);
      expect(result?.id).toBe(MOCK_EVENTS[1].id);
    });

    it('should ignore a cached event that is no longer among the home page events', () => {
      const deletedEvent: Event = {
        ...MOCK_EVENTS[2],
        id: 'deleted-event-id',
        eventDate: moment('2049-12-01').toISOString(),
      };
      const state = eventsAdapter.upsertOne(
        { event: deletedEvent, formData: INITIAL_EVENT_FORM_DATA },
        mockEventsState,
      );

      const result = EventsSelectors.selectNextEvent({ eventsState: state });

      expect(result).toEqual(MOCK_EVENTS[0]);
    });
  });
});
