import { Actions, createEffect, ofType } from '@ngrx/effects';
import { concatLatestFrom } from '@ngrx/operators';
import { routerNavigatedAction } from '@ngrx/router-store';
import { Store } from '@ngrx/store';
import moment from 'moment-timezone';
import { combineLatest, merge, of, timer } from 'rxjs';
import {
  catchError,
  concatMap,
  filter,
  map,
  mergeMap,
  switchMap,
  take,
} from 'rxjs/operators';

import { Injectable, inject } from '@angular/core';

import { DataPaginationOptions, Event } from '@app/models';
import { EventsApiService, UserService } from '@app/services';
import * as AppActions from '@app/store/app/app.actions';
import * as AuthSelectors from '@app/store/auth/auth.selectors';
import * as NavSelectors from '@app/store/nav/nav.selectors';
import { EXPORT_DATA_TO_CSV, IS_EXPIRED, PARSE_ERROR } from '@app/tokens';
import { isDefined } from '@app/utils';

import * as EventsActions from './events.actions';
import * as EventsSelectors from './events.selectors';

@Injectable()
export class EventsEffects {
  private readonly actions$ = inject(Actions);
  private readonly eventsApiService = inject(EventsApiService);
  private readonly store = inject(Store);

  private readonly exportDataToCsv = inject(EXPORT_DATA_TO_CSV);
  private readonly isExpired = inject(IS_EXPIRED);
  private readonly parseError = inject(PARSE_ERROR);
  private readonly userService = inject(UserService);

  fetchHomePageEvents$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(EventsActions.fetchHomePageEventsRequested),
      switchMap(() => {
        const options: DataPaginationOptions<Event> = {
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

        return this.eventsApiService.getFilteredEvents(options).pipe(
          map(response =>
            EventsActions.fetchHomePageEventsSucceeded({
              events: response.data.items,
              totalCount: response.data.totalCount,
            }),
          ),
          catchError(error =>
            of(
              EventsActions.fetchHomePageEventsFailed({
                error: this.parseError(error),
              }),
            ),
          ),
        );
      }),
    );
  });

  fetchFilteredEvents$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(EventsActions.fetchFilteredEventsRequested),
      concatLatestFrom(() => this.store.select(EventsSelectors.selectOptions)),
      switchMap(([, options]) =>
        this.eventsApiService.getFilteredEvents(options).pipe(
          map(response =>
            EventsActions.fetchFilteredEventsSucceeded({
              events: response.data.items,
              filteredCount: response.data.filteredCount,
              totalCount: response.data.totalCount,
            }),
          ),
          catchError(error =>
            of(
              EventsActions.fetchFilteredEventsFailed({ error: this.parseError(error) }),
            ),
          ),
        ),
      ),
    );
  });

  refetchHomePageEvents$ = createEffect(() => {
    const refetchActions$ = this.actions$.pipe(
      ofType(
        AppActions.refreshAppRequested,
        EventsActions.addEventSucceeded,
        EventsActions.updateEventSucceeded,
        EventsActions.deleteEventSucceeded,
      ),
    );

    const periodicCheck$ = timer(0, 10 * 60 * 1000).pipe(
      switchMap(() =>
        this.store.select(EventsSelectors.selectLastHomePageFetch).pipe(take(1)),
      ),
      filter(lastFetch => this.isExpired(lastFetch)),
    );

    return merge(refetchActions$, periodicCheck$).pipe(
      map(() => EventsActions.fetchHomePageEventsRequested()),
    );
  });

  refetchFilteredEvents$ = createEffect(() => {
    const refetchActions$ = merge(
      this.actions$.pipe(
        ofType(
          AppActions.refreshAppRequested,
          EventsActions.addEventSucceeded,
          EventsActions.updateEventSucceeded,
          EventsActions.deleteEventSucceeded,
        ),
      ),
      this.actions$.pipe(
        ofType(EventsActions.paginationOptionsChanged),
        filter(({ fetch }) => fetch),
      ),
    );

    const timerCheck$ = timer(0, 10 * 60 * 1000).pipe(
      switchMap(() =>
        combineLatest([
          this.store.select(EventsSelectors.selectLastFilteredFetch),
          this.store.select(NavSelectors.selectCurrentPath),
        ]).pipe(take(1)),
      ),
      filter(
        ([lastFetch, currentPath]) =>
          this.isExpired(lastFetch) &&
          !!(currentPath?.includes('/schedule') || currentPath?.includes('/event')),
      ),
    );

    const routerCheck$ = this.actions$.pipe(
      ofType(routerNavigatedAction),
      filter(({ payload }) => {
        const url = payload.event.url;
        return url.includes('/schedule') || url.includes('/event');
      }),
      switchMap(() =>
        this.store.select(EventsSelectors.selectLastFilteredFetch).pipe(take(1)),
      ),
      filter(lastFetch => this.isExpired(lastFetch)),
    );

    const periodicCheck$ = merge(timerCheck$, routerCheck$);

    return merge(refetchActions$, periodicCheck$).pipe(
      map(() => EventsActions.fetchFilteredEventsRequested()),
    );
  });

  fetchEvent$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(EventsActions.fetchEventRequested),
      switchMap(({ eventId }) => {
        return this.eventsApiService.getEvent(eventId).pipe(
          map(response => EventsActions.fetchEventSucceeded({ event: response.data })),
          catchError(error =>
            of(EventsActions.fetchEventFailed({ error: this.parseError(error) })),
          ),
        );
      }),
    );
  });

  addEvent$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(EventsActions.addEventRequested),
      concatLatestFrom(() => [
        this.store.select(EventsSelectors.selectEventFormDataById(null)),
        this.store.select(AuthSelectors.selectUser).pipe(filter(isDefined)),
      ]),
      concatMap(([, formData, user]) => {
        const event: Event = {
          ...formData,
          id: '',
          modificationInfo: {
            createdBy: `${user.firstName} ${user.lastName}`,
            createdByNumber: this.userService.memberNumber(),
            dateCreated: moment().toISOString(),
            lastEditedBy: `${user.firstName} ${user.lastName}`,
            lastEditedByNumber: this.userService.memberNumber(),
            dateLastEdited: moment().toISOString(),
          },
        };

        return this.eventsApiService.addEvent(event).pipe(
          map(response =>
            EventsActions.addEventSucceeded({
              event: { ...event, id: response.data },
            }),
          ),
          catchError(error =>
            of(EventsActions.addEventFailed({ error: this.parseError(error) })),
          ),
        );
      }),
    );
  });

  updateEvent$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(EventsActions.updateEventRequested),
      concatLatestFrom(({ eventId }) => [
        this.store
          .select(EventsSelectors.selectEventById(eventId))
          .pipe(filter(isDefined)),
        this.store.select(EventsSelectors.selectEventFormDataById(eventId)),
        this.store.select(AuthSelectors.selectUser).pipe(filter(isDefined)),
      ]),
      concatMap(([, event, formData, user]) => {
        const updatedEvent = {
          ...event,
          ...formData,
          modificationInfo: {
            ...event.modificationInfo,
            lastEditedBy: `${user.firstName} ${user.lastName}`,
            lastEditedByNumber: this.userService.memberNumber(),
            dateLastEdited: moment().toISOString(),
          },
        };

        return this.eventsApiService.updateEvent(updatedEvent).pipe(
          map(() =>
            EventsActions.updateEventSucceeded({
              event: updatedEvent,
              originalEventTitle: event.title,
            }),
          ),
          catchError(error =>
            of(EventsActions.updateEventFailed({ error: this.parseError(error) })),
          ),
        );
      }),
    );
  });

  deleteEvent$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(EventsActions.deleteEventRequested),
      mergeMap(({ event }) =>
        this.eventsApiService.deleteEvent(event.id).pipe(
          map(() =>
            EventsActions.deleteEventSucceeded({
              eventId: event.id,
              eventTitle: event.title,
            }),
          ),
          catchError(error =>
            of(EventsActions.deleteEventFailed({ error: this.parseError(error) })),
          ),
        ),
      ),
    );
  });

  exportEventsToCsv$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(EventsActions.exportEventsToCsvRequested),
      switchMap(() => {
        return this.eventsApiService.getAllEvents().pipe(
          map(response => {
            const filename = `events_export_${new Date().toISOString().split('T')[0]}.csv`;
            const exportResult = this.exportDataToCsv(response.data.items, filename);

            return typeof exportResult === 'number'
              ? EventsActions.exportEventsToCsvSucceeded({
                  exportedCount: exportResult,
                })
              : EventsActions.exportEventsToCsvFailed({ error: exportResult });
          }),
          catchError(error =>
            of(EventsActions.exportEventsToCsvFailed({ error: this.parseError(error) })),
          ),
        );
      }),
    );
  });
}
