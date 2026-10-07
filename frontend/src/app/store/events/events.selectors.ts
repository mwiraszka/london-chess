import { PAGE_SIZE_ALL } from '@eagami/ui';
import { createFeatureSelector, createSelector } from '@ngrx/store';
import { pick } from 'lodash-es';

import { initialEventFormData } from '@app/constants';
import { CalendarPage, Id } from '@app/models';
import {
  areSame,
  calendarMonthKeys,
  customSort,
  isUpcomingEvent,
  loadStatus,
  monthKeyOf,
} from '@app/utils';

import { EventsState, eventsAdapter } from './events.reducer';

const selectEventsState = createFeatureSelector<EventsState>('eventsState');

const selectFailedLoads = createSelector(selectEventsState, state => state.failedLoads);

export const selectLastHomePageFetch = createSelector(
  selectEventsState,
  state => state.lastHomePageFetch,
);

export const selectLastFilteredFetch = createSelector(
  selectEventsState,
  state => state.lastFilteredFetch,
);

export const selectHomePageEvents = createSelector(
  selectEventsState,
  state => state.homePageEvents,
);

export const selectFilteredEvents = createSelector(
  selectEventsState,
  state => state.filteredEvents,
);

export const selectOptions = createSelector(selectEventsState, state => state.options);

export const selectIsFetchingFiltered = createSelector(
  selectEventsState,
  state => state.isFetchingFiltered,
);

export const selectFilteredCount = createSelector(
  selectEventsState,
  state => state.filteredCount,
);

export const selectTotalCount = createSelector(
  selectEventsState,
  state => state.totalCount,
);

export const selectScheduleView = createSelector(
  selectEventsState,
  state => state.scheduleView,
);

export const selectCalendarPage = createSelector(
  selectEventsState,
  state => state.calendarPage,
);

export const selectCalendarMonthsPerPage = createSelector(
  selectEventsState,
  state => state.calendarMonthsPerPage,
);

// The calendar holds every matching event and shows a page of the months they span
export const selectCalendarView = createSelector(
  selectFilteredEvents,
  selectCalendarPage,
  selectCalendarMonthsPerPage,
  (events, page, monthsPerPage): CalendarPage => {
    const allMonths = calendarMonthKeys(events);
    const showsAll = monthsPerPage === PAGE_SIZE_ALL;
    const pageCount = showsAll ? 1 : Math.ceil(allMonths.length / monthsPerPage);
    const shownPage = Math.min(page, Math.max(pageCount, 1));
    const months = showsAll
      ? allMonths
      : allMonths.slice((shownPage - 1) * monthsPerPage, shownPage * monthsPerPage);
    const shownMonths = new Set(months);

    return {
      months,
      monthCount: allMonths.length,
      page: shownPage,
      monthsPerPage,
      events: events.filter(event => shownMonths.has(monthKeyOf(event.eventDate))),
    };
  },
);

const { selectAll: selectAllEventEntities } =
  eventsAdapter.getSelectors(selectEventsState);

export const selectEventById = (id: Id | null) =>
  createSelector(
    selectAllEventEntities,
    allEventEntities =>
      allEventEntities?.find(entity => entity.event.id === id)?.event ?? null,
  );

export const selectHomePageEventsStatus = createSelector(
  selectLastHomePageFetch,
  selectFailedLoads,
  (lastFetch, failedLoads) =>
    loadStatus(lastFetch !== null, failedLoads.includes('homePage')),
);

export const selectFilteredEventsStatus = createSelector(
  selectLastFilteredFetch,
  selectFailedLoads,
  (lastFetch, failedLoads) =>
    loadStatus(lastFetch !== null, failedLoads.includes('filtered')),
);

export const selectEventStatus = (id: Id | null) =>
  createSelector(selectEventById(id), selectFailedLoads, (event, failedLoads) =>
    loadStatus(!!event, failedLoads.includes('event')),
  );

export const selectEventFormDataById = (id: Id | null) =>
  createSelector(
    selectEventsState,
    selectAllEventEntities,
    (state, allEventEntities) =>
      allEventEntities?.find(entity => entity.event.id === id)?.formData ??
      state.newEventFormData ??
      initialEventFormData(),
  );

export const selectHasUnsavedChanges = (id: Id | null) =>
  createSelector(
    selectEventById(id),
    selectEventFormDataById(id),
    (event, eventFormData) => {
      const formPropertiesOfOriginalEvent = pick(
        event ?? initialEventFormData(),
        Object.getOwnPropertyNames(eventFormData),
      );

      return !areSame(formPropertiesOfOriginalEvent, eventFormData);
    },
  );

export const selectConcurrentNextEvents = createSelector(
  selectHomePageEvents,
  homePageEvents => {
    const sortedFutureEvents = [...homePageEvents]
      .sort((a, b) =>
        customSort(a, b, 'eventDate', false, 'modificationInfo.dateLastEdited', true),
      )
      .filter(isUpcomingEvent);

    return sortedFutureEvents.filter(
      event => event.eventDate === sortedFutureEvents[0].eventDate,
    );
  },
);
