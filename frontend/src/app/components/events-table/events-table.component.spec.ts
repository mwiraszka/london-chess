import { DebugElement } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { BasicDialogComponent } from '@app/components/basic-dialog/basic-dialog.component';
import { EVENTS_PAGE_SIZES } from '@app/constants/events-table';
import { MOCK_EVENTS } from '@app/mocks/events.mock';
import { DataPaginationOptions, Event } from '@app/models';
import { DialogService, StoreRequestService } from '@app/services';
import { EventsActions } from '@app/store/events';
import { lastOpenedDialog, query, queryAll } from '@app/utils';

import { EventRow, EventsTableComponent } from './events-table.component';

describe('EventsTableComponent', () => {
  let fixture: ComponentFixture<EventsTableComponent>;
  let component: EventsTableComponent;

  let dialogOpenSpy: MockInstance;
  let optionsChangeSpy: MockInstance;
  let storeRequestSpy: Mock;

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
        { provide: DialogService, useValue: { open: vi.fn() } },
        {
          provide: StoreRequestService,
          useValue: { dispatch: vi.fn().mockResolvedValue(null) },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(EventsTableComponent);
    component = fixture.componentInstance;

    dialogOpenSpy = vi.spyOn(TestBed.inject(DialogService), 'open');
    optionsChangeSpy = vi.spyOn(component.optionsChange, 'emit');
    storeRequestSpy = vi.mocked(TestBed.inject(StoreRequestService).dispatch);
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
      expect(query(entry, '.events__championship-icon')).toBeTruthy();
      expect(query(bodyRows()[0], '.events__championship-icon')).toBeFalsy();
      expect(query(fixture.debugElement, '.events__edited')).toBeFalsy();
      expect(query(fixture.debugElement, 'ea-paginator')).toBeFalsy();
    });

    it('should mark the first day still to come for the schedule to scroll to', () => {
      render({ events: [past, ...events] });

      expect(queryAll(fixture.debugElement, '.today-scroll-point')).toHaveLength(1);
      expect(query(bodyRows()[1], '.today-scroll-point')).toBeTruthy();
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

    it('should delete an event from the confirmation dialog', async () => {
      const event = events[0];

      component.getAdminControlsConfig(event).deleteCb?.();
      await fixture.whenStable();
      await lastOpenedDialog(dialogOpenSpy).confirmAction?.();

      expect(dialogOpenSpy).toHaveBeenCalledWith({
        componentType: BasicDialogComponent,
        inputs: {
          dialog: expect.objectContaining({
            title: 'Confirm',
            body: `Delete ${event.title}?`,
            confirmButtonText: 'Delete',
            confirmButtonType: 'warning',
          }),
        },
        isModal: true,
      });
      expect(storeRequestSpy).toHaveBeenCalledWith(
        EventsActions.deleteEventRequested({ event }),
        [EventsActions.deleteEventSucceeded, EventsActions.deleteEventFailed],
      );
    });

    it('should not delete anything until the dialog is confirmed', async () => {
      dialogOpenSpy.mockResolvedValue('cancel');

      component.getAdminControlsConfig(events[0]).deleteCb?.();
      await fixture.whenStable();

      expect(storeRequestSpy).not.toHaveBeenCalled();
    });
  });

  describe('with options', () => {
    beforeEach(() => render({ options, filteredCount: 50 }));

    it('should offer the page sizes and turn the pages', () => {
      const paginator = query(fixture.debugElement, 'ea-paginator');

      paginator.triggerEventHandler('changed', { page: 3, pageSize: 50 });

      expect(paginator.componentInstance.pageSizeOptions()).toEqual(EVENTS_PAGE_SIZES);
      expect(paginator.componentInstance.totalItems()).toBe(50);
      expect(optionsChangeSpy).toHaveBeenCalledWith({
        ...options,
        page: 3,
        pageSize: 50,
      });
    });

    it('should draw the line above the first day still to come, among past events', () => {
      render({ events: [past, ...events] });
      expect(query(fixture.debugElement, '.events__today')).toBeFalsy();

      render({
        events: [past, ...events],
        options: {
          ...options,
          filters: { showPastEvents: { ...options.filters.showPastEvents, value: true } },
        },
      });

      expect(query(bodyRows()[1], '.events__today')).toBeTruthy();
      expect(queryAll(fixture.debugElement, '.events__today')).toHaveLength(1);
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
