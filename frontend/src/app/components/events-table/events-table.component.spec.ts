import { DialogService } from '@eagami/ui';

import { DebugElement } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { PAGE_SIZES } from '@app/constants/filters';
import { MOCK_EVENTS } from '@app/mocks/events.mock';
import { DataPaginationOptions, Event } from '@app/models';
import { DeletionService, StoreRequestService } from '@app/services';
import { closedDialogRef, query, queryAll } from '@app/utils';

import { EventRow, EventsTableComponent } from './events-table.component';

describe('EventsTableComponent', () => {
  let fixture: ComponentFixture<EventsTableComponent>;
  let component: EventsTableComponent;

  let optionsChangeSpy: MockInstance;

  const events = MOCK_EVENTS.slice(0, 4);
  const past: Event = { ...MOCK_EVENTS[4], eventDate: '2000-01-01T23:00:00.000Z' };

  const options: DataPaginationOptions<Event> = {
    page: 2,
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

  const textOf = (element: DebugElement): string =>
    element.nativeElement.textContent.replace(/\s+/g, ' ').trim();

  const headers = () =>
    queryAll(fixture.debugElement, '.ea-data-table__cell--header').map(textOf);

  const bodyRows = () =>
    queryAll(fixture.debugElement, '.ea-data-table__body .ea-data-table__row');

  const render = (inputs: Partial<Record<string, unknown>> = {}) => {
    const values = {
      events,
      isAdmin: false,
      isLoading: false,
      ...inputs,
    };
    Object.entries(values).forEach(([name, value]) =>
      fixture.componentRef.setInput(name, value),
    );
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EventsTableComponent],
      providers: [
        provideRouter([]),
        { provide: DialogService, useValue: { open: vi.fn(() => closedDialogRef()) } },
        {
          provide: StoreRequestService,
          useValue: { dispatch: vi.fn().mockResolvedValue(null) },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(EventsTableComponent);
    component = fixture.componentInstance;

    optionsChangeSpy = vi.spyOn(component.optionsChange, 'emit');
  });

  describe('for the public', () => {
    beforeEach(() => render());

    it('should show the day and the event of each row', () => {
      const [date, entry] = queryAll(bodyRows()[1], '.ea-data-table__cell');

      expect(headers()).toEqual(['Event', '']);
      expect(textOf(query(date, '.events__date'))).toMatch(/2050$/);
      expect(textOf(query(entry, '.events__title'))).toBe(events[1].title);
      expect(textOf(query(entry, '.events__type'))).toBe('championship');
      expect(textOf(query(entry, '.events__details'))).toBe(events[1].details);
      expect(query(entry, '.events__type .championship-icon')).toBeTruthy();
      expect(query(bodyRows()[0], '.events__type .championship-icon')).toBeFalsy();
      expect(query(fixture.debugElement, '.events__edited')).toBeFalsy();
      expect(query(fixture.debugElement, 'ea-paginator')).toBeFalsy();
    });

    it('should mark the first day still to come for the schedule to scroll to', () => {
      render({ events: [past, ...events], markToday: true });

      expect(queryAll(fixture.debugElement, '.today-scroll-point')).toHaveLength(1);
      expect(query(bodyRows()[1], '.today-scroll-point')).toBeTruthy();
    });

    it('should mark no day unless asked to', () => {
      render({ events: [past, ...events] });

      expect(query(fixture.debugElement, '.today-scroll-point')).toBeFalsy();
      expect(query(fixture.debugElement, '.events__today')).toBeFalsy();
    });

    it('should link an event to its article', () => {
      expect(query(bodyRows()[0], 'a.events__article-link')).toBeFalsy();
      expect(query(bodyRows()[1], 'a.events__article-link').attributes['href']).toBe(
        `/article/view/${events[1].articleId}`,
      );
    });

    it('should show the events of the first so many days, a day to a row', () => {
      render({
        events: [...events, { ...MOCK_EVENTS[4], eventDate: events[2].eventDate }],
        dateLimit: 3,
      });

      expect(bodyRows().map(row => queryAll(row, '.events__title').map(textOf))).toEqual([
        [events[0].title],
        [events[1].title],
        [events[2].title, MOCK_EVENTS[4].title],
      ]);
      expect(queryAll(bodyRows()[2], '.events__date')).toHaveLength(1);
    });

    it('should size the columns by the widest events it is given', () => {
      fixture.componentRef.setInput('widestEvents', [MOCK_EVENTS[2]]);
      fixture.detectChanges();

      const sizingRows: EventRow[] = query(
        fixture.debugElement,
        'ea-data-table',
      ).componentInstance.sizingRows();

      expect(sizingRows.flatMap(row => row.events)).toEqual([MOCK_EVENTS[2]]);
    });
  });

  describe('for admins', () => {
    beforeEach(() => render({ isAdmin: true, showModificationInfo: true }));

    it('should show when each event was created and edited', () => {
      const edited = queryAll(bodyRows()[0], '.events__edited div').map(textOf);

      expect(edited[0]).toMatch(/^Event created .*2049$/);
      expect(edited[1]).toMatch(/^Last edited .*2049$/);
    });

    it('should give each event its controls', () => {
      const config = component.getAdminControlsConfig(events[0]);

      expect(config.editPath).toEqual(['event', 'edit', events[0].id]);
      expect(config.itemName).toBe(events[0].title);
    });

    it('should delete an event from its admin controls', () => {
      const deleteEvent = vi
        .spyOn(TestBed.inject(DeletionService), 'deleteEvent')
        .mockResolvedValue(false);

      component.getAdminControlsConfig(events[0]).deleteCb();

      expect(deleteEvent).toHaveBeenCalledExactlyOnceWith(events[0]);
    });
  });

  describe('with options', () => {
    beforeEach(() => render({ options, filteredCount: 50 }));

    it('should offer the page sizes and turn the pages', () => {
      const paginator = query(fixture.debugElement, 'ea-paginator');

      paginator.triggerEventHandler('changed', { page: 3, pageSize: 50 });

      expect(paginator.componentInstance.pageSizeOptions()).toEqual(PAGE_SIZES);
      expect(paginator.componentInstance.totalItems()).toBe(50);
      expect(optionsChangeSpy).toHaveBeenCalledWith({
        ...options,
        page: 3,
        pageSize: 50,
      });
    });

    it('should draw the line above the first day still to come, among past events', () => {
      render({ events: [past, ...events], markToday: true });

      expect(query(bodyRows()[1], '.events__today')).toBeTruthy();
      expect(queryAll(fixture.debugElement, '.events__today')).toHaveLength(1);
    });

    it('should draw the line above the first day on page one when every event is to come', () => {
      render({ events, markToday: true, options: { ...options, page: 1 } });
      const onFirstPage = query(bodyRows()[0], '.events__today');

      render({ events, markToday: true, options: { ...options, page: 2 } });

      expect(onFirstPage).toBeTruthy();
      expect(query(fixture.debugElement, '.events__today')).toBeFalsy();
    });

    it('should highlight what was searched for', () => {
      render({ options: { ...options, search: 'blitz' } });

      expect(queryAll(bodyRows()[0], 'mark.lcc-search-highlight').length).toBeGreaterThan(
        0,
      );
    });
  });

  describe('while the events load', () => {
    it('should hold a skeleton row for each day it will show', () => {
      render({ events: [], isLoading: true, dateLimit: 5 });

      expect(bodyRows()).toHaveLength(5);
      expect(query(bodyRows()[0], '.events__date ea-skeleton')).toBeTruthy();
      expect(queryAll(bodyRows()[0], 'lcc-text-skeleton')).toHaveLength(2);
    });

    it('should hold a skeleton row for each event of the page', () => {
      render({ events: [], isLoading: true, options });

      expect(bodyRows()).toHaveLength(10);
    });

    it('should show placeholders in place of the events already loaded', () => {
      render({ isLoading: true, options });

      expect(bodyRows()).toHaveLength(10);
      expect(
        query(fixture.debugElement, '.ea-data-table__body .events__title'),
      ).toBeFalsy();
    });
  });
});
