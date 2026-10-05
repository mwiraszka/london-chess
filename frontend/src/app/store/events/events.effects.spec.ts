import { provideMockActions } from '@ngrx/effects/testing';
import { Action } from '@ngrx/store';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import moment from 'moment-timezone';
import { ReplaySubject, firstValueFrom, of, throwError } from 'rxjs';

import { TestBed } from '@angular/core/testing';

import { initialEventFormData } from '@app/constants';
import { MOCK_EVENTS } from '@app/mocks/events.mock';
import { ApiResponse, Event, LccError, PaginatedItems, User } from '@app/models';
import { EventsApiService } from '@app/services';
import { AuthSelectors } from '@app/store/auth';
import { NavSelectors } from '@app/store/nav';
import { EXPORT_DATA_TO_CSV, IS_EXPIRED, PARSE_ERROR } from '@app/tokens';

import { EventsActions, EventsSelectors } from '.';
import { EventsEffects } from './events.effects';

const mockExportDataToCsv = vi.fn();
const mockParseError = vi.fn();
const mockIsExpired = vi.fn();

describe('EventsEffects', () => {
  let actions$: ReplaySubject<Action>;
  let effects: EventsEffects;
  let eventsApiService: Mocked<EventsApiService>;
  let store: MockStore;

  const mockUser: User = {
    id: 'user123',
    firstName: 'Test',
    lastName: 'User',
    email: 'test@example.com',
    isAdmin: true,
    memberNumber: null,
  };

  const mockError: LccError = {
    name: 'LCCError',
    message: 'Test error',
  };

  const mockApiResponse: ApiResponse<PaginatedItems<Event>> = {
    data: {
      items: [MOCK_EVENTS[0], MOCK_EVENTS[1]],
      filteredCount: 2,
      totalCount: 5,
    },
  };

  beforeEach(() => {
    const eventsApiServiceMock = {
      getAllEvents: vi.fn(),
      getFilteredEvents: vi.fn(),
      getEvent: vi.fn(),
      addEvent: vi.fn(),
      updateEvent: vi.fn(),
      deleteEvent: vi.fn(),
    };

    const mockEventsState = {
      ids: MOCK_EVENTS.map(e => e.id),
      entities: MOCK_EVENTS.reduce(
        (acc, event) => ({
          ...acc,
          [event.id]: { event, formData: initialEventFormData() },
        }),
        {},
      ),
      failedLoads: [],
      isFetchingFiltered: false,
      newEventFormData: initialEventFormData(),
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
        filters: {},
      },
      filteredCount: null,
      totalCount: 0,
      scheduleView: 'list' as const,
    };

    TestBed.configureTestingModule({
      providers: [
        EventsEffects,
        { provide: EXPORT_DATA_TO_CSV, useValue: mockExportDataToCsv },
        { provide: IS_EXPIRED, useValue: mockIsExpired },
        { provide: PARSE_ERROR, useValue: mockParseError },
        provideMockActions(() => actions$),
        { provide: EventsApiService, useValue: eventsApiServiceMock },
        provideMockStore({
          initialState: {
            eventsState: mockEventsState,
            navState: { pathHistory: [] },
          },
        }),
      ],
    });

    effects = TestBed.inject(EventsEffects);
    eventsApiService = TestBed.inject(EventsApiService) as Mocked<EventsApiService>;
    store = TestBed.inject(MockStore);
    actions$ = new ReplaySubject<Action>(1);

    vi.clearAllMocks();
    mockParseError.mockImplementation(error => error);
  });

  afterEach(() => store.resetSelectors());

  describe('fetchHomePageEvents$', () => {
    it('should fetch home page events with correct options', async () => {
      eventsApiService.getFilteredEvents.mockReturnValue(of(mockApiResponse));

      actions$.next(EventsActions.fetchHomePageEventsRequested());
      const action = await firstValueFrom(effects.fetchHomePageEvents$);

      expect(action).toEqual(
        EventsActions.fetchHomePageEventsSucceeded({
          events: mockApiResponse.data.items,
          totalCount: mockApiResponse.data.totalCount,
        }),
      );
      expect(eventsApiService.getFilteredEvents).toHaveBeenCalledWith({
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
      });
    });

    it('should handle fetch home page events failure', async () => {
      eventsApiService.getFilteredEvents.mockReturnValue(throwError(() => mockError));
      mockParseError.mockReturnValue(mockError);

      actions$.next(EventsActions.fetchHomePageEventsRequested());
      const action = await firstValueFrom(effects.fetchHomePageEvents$);

      expect(action).toEqual(
        EventsActions.fetchHomePageEventsFailed({ error: mockError }),
      );
    });
  });

  describe('fetchFilteredEvents$', () => {
    const mockOptions = {
      page: 2,
      pageSize: 10,
      sortBy: 'title' as const,
      sortOrder: 'desc' as const,
      filters: {
        showPastEvents: {
          label: 'Show past events',
          value: true,
        },
      },
      search: 'tournament',
    };

    beforeEach(() => {
      store.overrideSelector(EventsSelectors.selectOptions, mockOptions);
      store.refreshState();
    });

    it('should fetch filtered events with options from store', async () => {
      eventsApiService.getFilteredEvents.mockReturnValue(of(mockApiResponse));

      actions$.next(EventsActions.fetchFilteredEventsRequested());
      const action = await firstValueFrom(effects.fetchFilteredEvents$);

      expect(action).toEqual(
        EventsActions.fetchFilteredEventsSucceeded({
          events: mockApiResponse.data.items,
          filteredCount: mockApiResponse.data.filteredCount,
          totalCount: mockApiResponse.data.totalCount,
        }),
      );
      expect(eventsApiService.getFilteredEvents).toHaveBeenCalledWith(mockOptions);
    });

    it('should handle fetch filtered events failure', async () => {
      eventsApiService.getFilteredEvents.mockReturnValue(throwError(() => mockError));
      mockParseError.mockReturnValue(mockError);

      actions$.next(EventsActions.fetchFilteredEventsRequested());
      const action = await firstValueFrom(effects.fetchFilteredEvents$);

      expect(action).toEqual(
        EventsActions.fetchFilteredEventsFailed({ error: mockError }),
      );
    });
  });

  describe('refetchHomePageEvents$', () => {
    it('should check for stale home page events as soon as it starts', () => {
      vi.useFakeTimers();
      store.overrideSelector(EventsSelectors.selectLastHomePageFetch, null);
      store.refreshState();
      mockIsExpired.mockReturnValue(true);
      const results: Action[] = [];

      effects.refetchHomePageEvents$.subscribe(action => results.push(action));
      vi.advanceTimersByTime(0);

      expect(results).toEqual([EventsActions.fetchHomePageEventsRequested()]);
    });

    it('should trigger refetch after addEventSucceeded', async () => {
      actions$.next(EventsActions.addEventSucceeded({ event: MOCK_EVENTS[0] }));
      const action = await firstValueFrom(effects.refetchHomePageEvents$);

      expect(action).toEqual(EventsActions.fetchHomePageEventsRequested());
    });

    it('should trigger refetch after updateEventSucceeded', async () => {
      actions$.next(
        EventsActions.updateEventSucceeded({
          event: MOCK_EVENTS[0],
          originalEventTitle: 'Old Title',
        }),
      );
      const action = await firstValueFrom(effects.refetchHomePageEvents$);

      expect(action).toEqual(EventsActions.fetchHomePageEventsRequested());
    });

    it('should trigger refetch after deleteEventSucceeded', async () => {
      actions$.next(
        EventsActions.deleteEventSucceeded({
          eventId: MOCK_EVENTS[0].id,
          eventTitle: MOCK_EVENTS[0].title,
        }),
      );
      const action = await firstValueFrom(effects.refetchHomePageEvents$);

      expect(action).toEqual(EventsActions.fetchHomePageEventsRequested());
    });

    it('should trigger refetch when last fetch is expired', () => {
      vi.useFakeTimers();
      const expiredTimestamp = moment().subtract(20, 'minutes').toISOString();
      store.overrideSelector(EventsSelectors.selectLastHomePageFetch, expiredTimestamp);
      store.refreshState();
      mockIsExpired.mockReturnValue(true);

      const results: Action[] = [];
      effects.refetchHomePageEvents$.subscribe(action => {
        results.push(action);
      });

      vi.advanceTimersByTime(3000);
      vi.advanceTimersByTime(10 * 60 * 1000);

      expect(results[0]).toEqual(EventsActions.fetchHomePageEventsRequested());
      expect(mockIsExpired).toHaveBeenCalledWith(expiredTimestamp);
    });

    it('should not trigger refetch when last fetch is not expired', () => {
      vi.useFakeTimers();
      const recentTimestamp = moment().subtract(5, 'minutes').toISOString();
      store.overrideSelector(EventsSelectors.selectLastHomePageFetch, recentTimestamp);
      store.refreshState();
      mockIsExpired.mockReturnValue(false);

      const results: Action[] = [];
      effects.refetchHomePageEvents$.subscribe(action => {
        results.push(action);
      });

      vi.advanceTimersByTime(3000);
      vi.advanceTimersByTime(10 * 60 * 1000);

      expect(results).toHaveLength(0);
    });
  });

  describe('refetchFilteredEvents$', () => {
    it('should trigger refetch after addEventSucceeded', async () => {
      actions$.next(EventsActions.addEventSucceeded({ event: MOCK_EVENTS[0] }));
      const action = await firstValueFrom(effects.refetchFilteredEvents$);

      expect(action).toEqual(EventsActions.fetchFilteredEventsRequested());
    });

    it('should trigger refetch after updateEventSucceeded', async () => {
      actions$.next(
        EventsActions.updateEventSucceeded({
          event: MOCK_EVENTS[0],
          originalEventTitle: 'Old Title',
        }),
      );
      const action = await firstValueFrom(effects.refetchFilteredEvents$);

      expect(action).toEqual(EventsActions.fetchFilteredEventsRequested());
    });

    it('should trigger refetch after deleteEventSucceeded', async () => {
      actions$.next(
        EventsActions.deleteEventSucceeded({
          eventId: MOCK_EVENTS[0].id,
          eventTitle: MOCK_EVENTS[0].title,
        }),
      );
      const action = await firstValueFrom(effects.refetchFilteredEvents$);

      expect(action).toEqual(EventsActions.fetchFilteredEventsRequested());
    });

    it('should trigger refetch after paginationOptionsChanged', async () => {
      actions$.next(
        EventsActions.paginationOptionsChanged({
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
        }),
      );
      const action = await firstValueFrom(effects.refetchFilteredEvents$);

      expect(action).toEqual(EventsActions.fetchFilteredEventsRequested());
    });

    it('should check for stale events as soon as it starts', () => {
      vi.useFakeTimers();
      store.overrideSelector(EventsSelectors.selectLastFilteredFetch, null);
      store.overrideSelector(NavSelectors.selectCurrentPath, '/schedule');
      store.refreshState();
      mockIsExpired.mockReturnValue(true);
      const results: Action[] = [];

      effects.refetchFilteredEvents$.subscribe(action => results.push(action));
      vi.advanceTimersByTime(0);

      expect(results).toEqual([EventsActions.fetchFilteredEventsRequested()]);
    });

    it('should trigger refetch when last fetch is expired', () => {
      vi.useFakeTimers();
      const expiredTimestamp = moment().subtract(20, 'minutes').toISOString();
      store.overrideSelector(EventsSelectors.selectLastFilteredFetch, expiredTimestamp);
      store.overrideSelector(NavSelectors.selectCurrentPath, '/schedule');
      store.refreshState();
      mockIsExpired.mockReturnValue(true);

      const results: Action[] = [];
      effects.refetchFilteredEvents$.subscribe(action => {
        results.push(action);
      });

      vi.advanceTimersByTime(3000);
      vi.advanceTimersByTime(10 * 60 * 1000);

      expect(results[0]).toEqual(EventsActions.fetchFilteredEventsRequested());
      expect(mockIsExpired).toHaveBeenCalledWith(expiredTimestamp);
    });

    it('should not trigger refetch when last fetch is not expired', () => {
      vi.useFakeTimers();
      const recentTimestamp = moment().subtract(5, 'minutes').toISOString();
      store.overrideSelector(EventsSelectors.selectLastFilteredFetch, recentTimestamp);
      store.overrideSelector(NavSelectors.selectCurrentPath, '/schedule');
      store.refreshState();
      mockIsExpired.mockReturnValue(false);

      const results: Action[] = [];
      effects.refetchFilteredEvents$.subscribe(action => {
        results.push(action);
      });

      vi.advanceTimersByTime(3000);
      vi.advanceTimersByTime(10 * 60 * 1000);

      expect(results).toHaveLength(0);
    });
  });

  describe('fetchEvent$', () => {
    it('should fetch a single event successfully', async () => {
      const mockResponse: ApiResponse<Event> = { data: MOCK_EVENTS[0] };
      eventsApiService.getEvent.mockReturnValue(of(mockResponse));

      actions$.next(EventsActions.fetchEventRequested({ eventId: MOCK_EVENTS[0].id }));
      const action = await firstValueFrom(effects.fetchEvent$);

      expect(action).toEqual(
        EventsActions.fetchEventSucceeded({ event: MOCK_EVENTS[0] }),
      );
      expect(eventsApiService.getEvent).toHaveBeenCalledWith(MOCK_EVENTS[0].id);
    });

    it('should handle fetch event failure', async () => {
      eventsApiService.getEvent.mockReturnValue(throwError(() => mockError));
      mockParseError.mockReturnValue(mockError);

      actions$.next(EventsActions.fetchEventRequested({ eventId: 'invalid-id' }));
      const action = await firstValueFrom(effects.fetchEvent$);

      expect(action).toEqual(EventsActions.fetchEventFailed({ error: mockError }));
    });
  });

  describe('addEvent$', () => {
    beforeEach(() => {
      store.overrideSelector(AuthSelectors.selectUser, mockUser);
      store.refreshState();
    });

    it('should add event successfully', async () => {
      const mockAddResponse: ApiResponse<string> = { data: 'new-event-id' };

      eventsApiService.addEvent.mockReturnValue(of(mockAddResponse));

      actions$.next(EventsActions.addEventRequested());
      const action = await firstValueFrom(effects.addEvent$);

      expect(action.type).toBe(EventsActions.addEventSucceeded.type);
      const payload = (action as ReturnType<typeof EventsActions.addEventSucceeded>)
        .event;
      expect(payload.id).toBe('new-event-id');
      expect(payload.modificationInfo.createdBy).toBe('Test User');
      expect(payload.modificationInfo.lastEditedBy).toBe('Test User');
      expect(eventsApiService.addEvent).toHaveBeenCalled();
    });

    it('should handle add event failure', async () => {
      eventsApiService.addEvent.mockReturnValue(throwError(() => mockError));
      mockParseError.mockReturnValue(mockError);

      actions$.next(EventsActions.addEventRequested());
      const action = await firstValueFrom(effects.addEvent$);

      expect(action).toEqual(EventsActions.addEventFailed({ error: mockError }));
    });
  });

  describe('updateEvent$', () => {
    beforeEach(() => {
      store.overrideSelector(AuthSelectors.selectUser, mockUser);
      store.refreshState();
    });

    it('should update event successfully', async () => {
      const eventId = MOCK_EVENTS[0].id;
      const mockUpdateResponse: ApiResponse<string> = { data: eventId };

      eventsApiService.updateEvent.mockReturnValue(of(mockUpdateResponse));

      actions$.next(EventsActions.updateEventRequested({ eventId }));
      const action = await firstValueFrom(effects.updateEvent$);

      expect(action.type).toBe(EventsActions.updateEventSucceeded.type);
      const payload = action as ReturnType<typeof EventsActions.updateEventSucceeded>;
      expect(payload.event.id).toBe(eventId);
      expect(payload.event.modificationInfo.lastEditedBy).toBe('Test User');
      expect(payload.originalEventTitle).toBe(MOCK_EVENTS[0].title);
      expect(eventsApiService.updateEvent).toHaveBeenCalled();
    });

    it('should handle update event failure', async () => {
      const eventId = MOCK_EVENTS[0].id;

      eventsApiService.updateEvent.mockReturnValue(throwError(() => mockError));
      mockParseError.mockReturnValue(mockError);

      actions$.next(EventsActions.updateEventRequested({ eventId }));
      const action = await firstValueFrom(effects.updateEvent$);

      expect(action).toEqual(EventsActions.updateEventFailed({ error: mockError }));
    });
  });

  describe('deleteEvent$', () => {
    it('should delete event successfully', async () => {
      const mockDeleteResponse: ApiResponse<string> = { data: MOCK_EVENTS[0].id };
      eventsApiService.deleteEvent.mockReturnValue(of(mockDeleteResponse));

      actions$.next(EventsActions.deleteEventRequested({ event: MOCK_EVENTS[0] }));
      const action = await firstValueFrom(effects.deleteEvent$);

      expect(action).toEqual(
        EventsActions.deleteEventSucceeded({
          eventId: MOCK_EVENTS[0].id,
          eventTitle: MOCK_EVENTS[0].title,
        }),
      );
      expect(eventsApiService.deleteEvent).toHaveBeenCalledWith(MOCK_EVENTS[0].id);
    });

    it('should handle delete event failure', async () => {
      eventsApiService.deleteEvent.mockReturnValue(throwError(() => mockError));
      mockParseError.mockReturnValue(mockError);

      actions$.next(EventsActions.deleteEventRequested({ event: MOCK_EVENTS[0] }));
      const action = await firstValueFrom(effects.deleteEvent$);

      expect(action).toEqual(EventsActions.deleteEventFailed({ error: mockError }));
    });
  });

  describe('exportEventsToCsv$', () => {
    it('should export events to CSV successfully', async () => {
      const exportedCount = 5;
      eventsApiService.getAllEvents.mockReturnValue(of(mockApiResponse));
      mockExportDataToCsv.mockReturnValue(exportedCount);

      actions$.next(EventsActions.exportEventsToCsvRequested());
      const action = await firstValueFrom(effects.exportEventsToCsv$);

      expect(action).toEqual(EventsActions.exportEventsToCsvSucceeded({ exportedCount }));
      expect(eventsApiService.getAllEvents).toHaveBeenCalled();
      expect(mockExportDataToCsv).toHaveBeenCalledWith(
        mockApiResponse.data.items,
        expect.stringMatching(/^events_export_\d{4}-\d{2}-\d{2}\.csv$/),
      );
    });

    it('should handle export failure when exportDataToCsv returns error', async () => {
      const exportError: LccError = {
        name: 'LCCError',
        message: 'Export failed',
      };
      eventsApiService.getAllEvents.mockReturnValue(of(mockApiResponse));
      mockExportDataToCsv.mockReturnValue(exportError);

      actions$.next(EventsActions.exportEventsToCsvRequested());
      const action = await firstValueFrom(effects.exportEventsToCsv$);

      expect(action).toEqual(
        EventsActions.exportEventsToCsvFailed({ error: exportError }),
      );
    });

    it('should handle API error during export', async () => {
      eventsApiService.getAllEvents.mockReturnValue(throwError(() => mockError));
      mockParseError.mockReturnValue(mockError);

      actions$.next(EventsActions.exportEventsToCsvRequested());
      const action = await firstValueFrom(effects.exportEventsToCsv$);

      expect(action).toEqual(EventsActions.exportEventsToCsvFailed({ error: mockError }));
    });
  });
});
