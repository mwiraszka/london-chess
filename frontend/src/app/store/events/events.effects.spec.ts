import { provideMockActions } from '@ngrx/effects/testing';
import { Action } from '@ngrx/store';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import moment from 'moment-timezone';
import { ReplaySubject, of, throwError } from 'rxjs';

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { INITIAL_EVENT_FORM_DATA } from '@app/constants';
import { MOCK_EVENTS } from '@app/mocks/events.mock';
import { ApiResponse, Event, LccError, PaginatedItems, User } from '@app/models';
import { EventsApiService, UserService } from '@app/services';
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
          [event.id]: { event, formData: INITIAL_EVENT_FORM_DATA },
        }),
        {},
      ),
      callState: { status: 'idle' as const, loadStart: null, error: null },
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
        { provide: UserService, useValue: { memberNumber: signal(null) } },
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

  describe('fetchAllEvents$', () => {
    it('should fetch all events successfully', () =>
      withDone(done => {
        eventsApiService.getAllEvents.mockReturnValue(of(mockApiResponse));

        actions$.next(EventsActions.fetchAllEventsRequested());

        effects.fetchAllEvents$.subscribe(action => {
          expect(action).toEqual(
            EventsActions.fetchAllEventsSucceeded({
              events: mockApiResponse.data.items,
              totalCount: mockApiResponse.data.totalCount,
            }),
          );
          expect(eventsApiService.getAllEvents).toHaveBeenCalledTimes(1);
          done();
        });
      }));

    it('should handle fetch all events failure', () =>
      withDone(done => {
        eventsApiService.getAllEvents.mockReturnValue(throwError(() => mockError));
        mockParseError.mockReturnValue(mockError);

        actions$.next(EventsActions.fetchAllEventsRequested());

        effects.fetchAllEvents$.subscribe(action => {
          expect(action).toEqual(
            EventsActions.fetchAllEventsFailed({ error: mockError }),
          );
          expect(mockParseError).toHaveBeenCalledWith(mockError);
          done();
        });
      }));
  });

  describe('fetchHomePageEvents$', () => {
    it('should fetch home page events with correct options', () =>
      withDone(done => {
        eventsApiService.getFilteredEvents.mockReturnValue(of(mockApiResponse));

        actions$.next(EventsActions.fetchHomePageEventsRequested());

        effects.fetchHomePageEvents$.subscribe(action => {
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
          done();
        });
      }));

    it('should fetch home page events in background', () =>
      withDone(done => {
        eventsApiService.getFilteredEvents.mockReturnValue(of(mockApiResponse));

        actions$.next(EventsActions.fetchHomePageEventsInBackgroundRequested());

        effects.fetchHomePageEvents$.subscribe(action => {
          expect(action).toEqual(
            EventsActions.fetchHomePageEventsSucceeded({
              events: mockApiResponse.data.items,
              totalCount: mockApiResponse.data.totalCount,
            }),
          );
          done();
        });
      }));

    it('should handle fetch home page events failure', () =>
      withDone(done => {
        eventsApiService.getFilteredEvents.mockReturnValue(throwError(() => mockError));
        mockParseError.mockReturnValue(mockError);

        actions$.next(EventsActions.fetchHomePageEventsRequested());

        effects.fetchHomePageEvents$.subscribe(action => {
          expect(action).toEqual(
            EventsActions.fetchHomePageEventsFailed({ error: mockError }),
          );
          done();
        });
      }));
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

    it('should fetch filtered events with options from store', () =>
      withDone(done => {
        eventsApiService.getFilteredEvents.mockReturnValue(of(mockApiResponse));

        actions$.next(EventsActions.fetchFilteredEventsRequested());

        effects.fetchFilteredEvents$.subscribe(action => {
          expect(action).toEqual(
            EventsActions.fetchFilteredEventsSucceeded({
              events: mockApiResponse.data.items,
              filteredCount: mockApiResponse.data.filteredCount,
              totalCount: mockApiResponse.data.totalCount,
            }),
          );
          expect(eventsApiService.getFilteredEvents).toHaveBeenCalledWith(mockOptions);
          done();
        });
      }));

    it('should fetch filtered events in background', () =>
      withDone(done => {
        eventsApiService.getFilteredEvents.mockReturnValue(of(mockApiResponse));

        actions$.next(EventsActions.fetchFilteredEventsInBackgroundRequested());

        effects.fetchFilteredEvents$.subscribe(action => {
          expect(action).toEqual(
            EventsActions.fetchFilteredEventsSucceeded({
              events: mockApiResponse.data.items,
              filteredCount: mockApiResponse.data.filteredCount,
              totalCount: mockApiResponse.data.totalCount,
            }),
          );
          done();
        });
      }));

    it('should handle fetch filtered events failure', () =>
      withDone(done => {
        eventsApiService.getFilteredEvents.mockReturnValue(throwError(() => mockError));
        mockParseError.mockReturnValue(mockError);

        actions$.next(EventsActions.fetchFilteredEventsRequested());

        effects.fetchFilteredEvents$.subscribe(action => {
          expect(action).toEqual(
            EventsActions.fetchFilteredEventsFailed({ error: mockError }),
          );
          done();
        });
      }));
  });

  describe('refetchHomePageEvents$', () => {
    it('should trigger refetch after addEventSucceeded', () =>
      withDone(done => {
        actions$.next(EventsActions.addEventSucceeded({ event: MOCK_EVENTS[0] }));

        effects.refetchHomePageEvents$.subscribe(action => {
          expect(action).toEqual(
            EventsActions.fetchHomePageEventsInBackgroundRequested(),
          );
          done();
        });
      }));

    it('should trigger refetch after updateEventSucceeded', () =>
      withDone(done => {
        actions$.next(
          EventsActions.updateEventSucceeded({
            event: MOCK_EVENTS[0],
            originalEventTitle: 'Old Title',
          }),
        );

        effects.refetchHomePageEvents$.subscribe(action => {
          expect(action).toEqual(
            EventsActions.fetchHomePageEventsInBackgroundRequested(),
          );
          done();
        });
      }));

    it('should trigger refetch after deleteEventSucceeded', () =>
      withDone(done => {
        actions$.next(
          EventsActions.deleteEventSucceeded({
            eventId: MOCK_EVENTS[0].id,
            eventTitle: MOCK_EVENTS[0].title,
          }),
        );

        effects.refetchHomePageEvents$.subscribe(action => {
          expect(action).toEqual(
            EventsActions.fetchHomePageEventsInBackgroundRequested(),
          );
          done();
        });
      }));

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

      expect(results[0]).toEqual(
        EventsActions.fetchHomePageEventsInBackgroundRequested(),
      );
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
    it('should trigger refetch after addEventSucceeded', () =>
      withDone(done => {
        actions$.next(EventsActions.addEventSucceeded({ event: MOCK_EVENTS[0] }));

        effects.refetchFilteredEvents$.subscribe(action => {
          expect(action).toEqual(
            EventsActions.fetchFilteredEventsInBackgroundRequested(),
          );
          done();
        });
      }));

    it('should trigger refetch after updateEventSucceeded', () =>
      withDone(done => {
        actions$.next(
          EventsActions.updateEventSucceeded({
            event: MOCK_EVENTS[0],
            originalEventTitle: 'Old Title',
          }),
        );

        effects.refetchFilteredEvents$.subscribe(action => {
          expect(action).toEqual(
            EventsActions.fetchFilteredEventsInBackgroundRequested(),
          );
          done();
        });
      }));

    it('should trigger refetch after deleteEventSucceeded', () =>
      withDone(done => {
        actions$.next(
          EventsActions.deleteEventSucceeded({
            eventId: MOCK_EVENTS[0].id,
            eventTitle: MOCK_EVENTS[0].title,
          }),
        );

        effects.refetchFilteredEvents$.subscribe(action => {
          expect(action).toEqual(
            EventsActions.fetchFilteredEventsInBackgroundRequested(),
          );
          done();
        });
      }));

    it('should trigger refetch after paginationOptionsChanged', () =>
      withDone(done => {
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
            fetch: true,
          }),
        );

        effects.refetchFilteredEvents$.subscribe(action => {
          expect(action).toEqual(
            EventsActions.fetchFilteredEventsInBackgroundRequested(),
          );
          done();
        });
      }));

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

      expect(results[0]).toEqual(
        EventsActions.fetchFilteredEventsInBackgroundRequested(),
      );
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
    it('should fetch a single event successfully', () =>
      withDone(done => {
        const mockResponse: ApiResponse<Event> = { data: MOCK_EVENTS[0] };
        eventsApiService.getEvent.mockReturnValue(of(mockResponse));

        actions$.next(EventsActions.fetchEventRequested({ eventId: MOCK_EVENTS[0].id }));

        effects.fetchEvent$.subscribe(action => {
          expect(action).toEqual(
            EventsActions.fetchEventSucceeded({ event: MOCK_EVENTS[0] }),
          );
          expect(eventsApiService.getEvent).toHaveBeenCalledWith(MOCK_EVENTS[0].id);
          done();
        });
      }));

    it('should handle fetch event failure', () =>
      withDone(done => {
        eventsApiService.getEvent.mockReturnValue(throwError(() => mockError));
        mockParseError.mockReturnValue(mockError);

        actions$.next(EventsActions.fetchEventRequested({ eventId: 'invalid-id' }));

        effects.fetchEvent$.subscribe(action => {
          expect(action).toEqual(EventsActions.fetchEventFailed({ error: mockError }));
          done();
        });
      }));
  });

  describe('addEvent$', () => {
    beforeEach(() => {
      store.overrideSelector(AuthSelectors.selectUser, mockUser);
      store.refreshState();
    });

    it('should add event successfully', () =>
      withDone(done => {
        const mockAddResponse: ApiResponse<string> = { data: 'new-event-id' };

        eventsApiService.addEvent.mockReturnValue(of(mockAddResponse));

        actions$.next(EventsActions.addEventRequested());

        effects.addEvent$.subscribe(action => {
          expect(action.type).toBe(EventsActions.addEventSucceeded.type);
          const payload = (action as ReturnType<typeof EventsActions.addEventSucceeded>)
            .event;
          expect(payload.id).toBe('new-event-id');
          expect(payload.modificationInfo.createdBy).toBe('Test User');
          expect(payload.modificationInfo.lastEditedBy).toBe('Test User');
          expect(eventsApiService.addEvent).toHaveBeenCalled();
          done();
        });
      }));

    it('should handle add event failure', () =>
      withDone(done => {
        eventsApiService.addEvent.mockReturnValue(throwError(() => mockError));
        mockParseError.mockReturnValue(mockError);

        actions$.next(EventsActions.addEventRequested());

        effects.addEvent$.subscribe(action => {
          expect(action).toEqual(EventsActions.addEventFailed({ error: mockError }));
          done();
        });
      }));
  });

  describe('updateEvent$', () => {
    beforeEach(() => {
      store.overrideSelector(AuthSelectors.selectUser, mockUser);
      store.refreshState();
    });

    it('should update event successfully', () =>
      withDone(done => {
        const eventId = MOCK_EVENTS[0].id;
        const mockUpdateResponse: ApiResponse<string> = { data: eventId };

        eventsApiService.updateEvent.mockReturnValue(of(mockUpdateResponse));

        actions$.next(EventsActions.updateEventRequested({ eventId }));

        effects.updateEvent$.subscribe(action => {
          expect(action.type).toBe(EventsActions.updateEventSucceeded.type);
          const payload = action as ReturnType<typeof EventsActions.updateEventSucceeded>;
          expect(payload.event.id).toBe(eventId);
          expect(payload.event.modificationInfo.lastEditedBy).toBe('Test User');
          expect(payload.originalEventTitle).toBe(MOCK_EVENTS[0].title);
          expect(eventsApiService.updateEvent).toHaveBeenCalled();
          done();
        });
      }));

    it('should handle update event failure', () =>
      withDone(done => {
        const eventId = MOCK_EVENTS[0].id;

        eventsApiService.updateEvent.mockReturnValue(throwError(() => mockError));
        mockParseError.mockReturnValue(mockError);

        actions$.next(EventsActions.updateEventRequested({ eventId }));

        effects.updateEvent$.subscribe(action => {
          expect(action).toEqual(EventsActions.updateEventFailed({ error: mockError }));
          done();
        });
      }));

    it('should not dispatch success if response ID does not match', () =>
      withDone(done => {
        const eventId = MOCK_EVENTS[0].id;
        const mockUpdateResponse: ApiResponse<string> = { data: 'different-id' };

        eventsApiService.updateEvent.mockReturnValue(of(mockUpdateResponse));

        actions$.next(EventsActions.updateEventRequested({ eventId }));

        const subscription = effects.updateEvent$.subscribe(() => {
          done.fail('Should not dispatch action when IDs do not match');
        });

        setTimeout(() => {
          subscription.unsubscribe();
          done();
        }, 100);
      }));
  });

  describe('deleteEvent$', () => {
    it('should delete event successfully', () =>
      withDone(done => {
        const mockDeleteResponse: ApiResponse<string> = { data: MOCK_EVENTS[0].id };
        eventsApiService.deleteEvent.mockReturnValue(of(mockDeleteResponse));

        actions$.next(EventsActions.deleteEventRequested({ event: MOCK_EVENTS[0] }));

        effects.deleteEvent$.subscribe(action => {
          expect(action).toEqual(
            EventsActions.deleteEventSucceeded({
              eventId: MOCK_EVENTS[0].id,
              eventTitle: MOCK_EVENTS[0].title,
            }),
          );
          expect(eventsApiService.deleteEvent).toHaveBeenCalledWith(MOCK_EVENTS[0].id);
          done();
        });
      }));

    it('should handle delete event failure', () =>
      withDone(done => {
        eventsApiService.deleteEvent.mockReturnValue(throwError(() => mockError));
        mockParseError.mockReturnValue(mockError);

        actions$.next(EventsActions.deleteEventRequested({ event: MOCK_EVENTS[0] }));

        effects.deleteEvent$.subscribe(action => {
          expect(action).toEqual(EventsActions.deleteEventFailed({ error: mockError }));
          done();
        });
      }));

    it('should not dispatch success if response ID does not match', () =>
      withDone(done => {
        const mockDeleteResponse: ApiResponse<string> = { data: 'different-id' };
        eventsApiService.deleteEvent.mockReturnValue(of(mockDeleteResponse));

        actions$.next(EventsActions.deleteEventRequested({ event: MOCK_EVENTS[0] }));

        const subscription = effects.deleteEvent$.subscribe(() => {
          done.fail('Should not dispatch action when IDs do not match');
        });

        setTimeout(() => {
          subscription.unsubscribe();
          done();
        }, 100);
      }));
  });

  describe('exportEventsToCsv$', () => {
    it('should export events to CSV successfully', () =>
      withDone(done => {
        const exportedCount = 5;
        eventsApiService.getAllEvents.mockReturnValue(of(mockApiResponse));
        mockExportDataToCsv.mockReturnValue(exportedCount);

        actions$.next(EventsActions.exportEventsToCsvRequested());

        effects.exportEventsToCsv$.subscribe(action => {
          expect(action).toEqual(
            EventsActions.exportEventsToCsvSucceeded({ exportedCount }),
          );
          expect(eventsApiService.getAllEvents).toHaveBeenCalled();
          expect(mockExportDataToCsv).toHaveBeenCalledWith(
            mockApiResponse.data.items,
            expect.stringMatching(/^events_export_\d{4}-\d{2}-\d{2}\.csv$/),
          );
          done();
        });
      }));

    it('should handle export failure when exportDataToCsv returns error', () =>
      withDone(done => {
        const exportError: LccError = {
          name: 'LCCError',
          message: 'Export failed',
        };
        eventsApiService.getAllEvents.mockReturnValue(of(mockApiResponse));
        mockExportDataToCsv.mockReturnValue(exportError);

        actions$.next(EventsActions.exportEventsToCsvRequested());

        effects.exportEventsToCsv$.subscribe(action => {
          expect(action).toEqual(
            EventsActions.exportEventsToCsvFailed({ error: exportError }),
          );
          done();
        });
      }));

    it('should handle API error during export', () =>
      withDone(done => {
        eventsApiService.getAllEvents.mockReturnValue(throwError(() => mockError));
        mockParseError.mockReturnValue(mockError);

        actions$.next(EventsActions.exportEventsToCsvRequested());

        effects.exportEventsToCsv$.subscribe(action => {
          expect(action).toEqual(
            EventsActions.fetchAllEventsFailed({ error: mockError }),
          );
          done();
        });
      }));
  });
});
