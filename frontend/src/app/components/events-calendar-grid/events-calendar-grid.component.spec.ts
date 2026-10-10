import { DialogService, PAGE_SIZE_ALL, TooltipDirective } from '@eagami/ui';

import { TemplateRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { EventInfoDialogComponent } from '@app/components/event-info-dialog/event-info-dialog.component';
import { AdminControlsDirective } from '@app/directives/admin-controls.directive';
import { MOCK_EVENTS } from '@app/mocks/events.mock';
import { CalendarMonth, Event } from '@app/models';
import { FormatDatePipe, HighlightPipe, KebabCasePipe } from '@app/pipes';
import { DeletionService, StoreRequestService } from '@app/services';
import { IS_TOUCH_DEVICE } from '@app/tokens';
import { closedDialogRef, query, queryAll } from '@app/utils';

import { EventsCalendarGridComponent } from './events-calendar-grid.component';

describe('EventsCalendarGridComponent', () => {
  let fixture: ComponentFixture<EventsCalendarGridComponent>;
  let component: EventsCalendarGridComponent;

  let dialogService: DialogService;

  let dialogOpenSpy: MockInstance;

  const mockEvents = MOCK_EVENTS.slice(0, 2);
  const mockIsAdmin = true;
  const mockMonths = ['2050-01', '2050-02', '2050-03'];

  const setPage = (target: ComponentFixture<EventsCalendarGridComponent>): void => {
    target.componentRef.setInput('events', mockEvents);
    target.componentRef.setInput('months', mockMonths);
    target.componentRef.setInput('monthCount', 7);
    target.componentRef.setInput('page', 1);
    target.componentRef.setInput('monthsPerPage', 3);
    target.componentRef.setInput('isAdmin', mockIsAdmin);
  };

  const tooltip = (): HTMLElement | null => document.body.querySelector('.ea-tooltip');

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2050-01-01T17:00:00.000Z'));

    await TestBed.configureTestingModule({
      imports: [
        AdminControlsDirective,
        EventsCalendarGridComponent,
        FormatDatePipe,
        HighlightPipe,
        KebabCasePipe,
      ],
      providers: [
        { provide: IS_TOUCH_DEVICE, useValue: vi.fn() },
        {
          provide: DialogService,
          useValue: { open: vi.fn(() => closedDialogRef()) },
        },
        {
          provide: StoreRequestService,
          useValue: { dispatch: vi.fn().mockResolvedValue(null) },
        },
        provideRouter([{ path: 'article/view/:id', component: class {} }]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(EventsCalendarGridComponent);
    component = fixture.componentInstance;

    dialogService = TestBed.inject(DialogService);

    dialogOpenSpy = vi.spyOn(dialogService, 'open');

    setPage(fixture);

    fixture.detectChanges();
  });

  afterEach(() => vi.useRealTimers());

  describe('getAdminControlsConfig', () => {
    it('should return correct configuration for event', () => {
      const config = component.getAdminControlsConfig(mockEvents[0]);

      expect(config.buttonSize).toBe(34);
      expect(config.editPath).toEqual(['event', 'edit', mockEvents[0].id]);
      expect(config.itemName).toBe(mockEvents[0].title);
    });

    it('should delete an event from its admin controls', () => {
      const deleteEvent = vi
        .spyOn(TestBed.inject(DeletionService), 'deleteEvent')
        .mockResolvedValue(false);

      component.getAdminControlsConfig(mockEvents[0]).deleteCb();

      expect(deleteEvent).toHaveBeenCalledExactlyOnceWith(mockEvents[0]);
    });
  });

  describe('months', () => {
    it('should lay out the months it is given, those without events included', () => {
      expect(component.calendarMonths().map(month => month.monthYear)).toEqual([
        'January 2050',
        'February 2050',
        'March 2050',
      ]);
      expect(component.calendarMonths().map(month => month.hasEvents)).toEqual([
        true,
        false,
        true,
      ]);
    });

    it('should mark today and its month', () => {
      vi.setSystemTime(new Date('2049-12-20T17:00:00.000Z'));

      fixture.componentRef.setInput('months', ['2049-12', ...mockMonths]);
      fixture.detectChanges();

      expect(
        query(fixture.debugElement, '.calendar-day.today').nativeElement.textContent,
      ).toContain('20');
      expect(query(fixture.debugElement, '.month').classes['no-events']).toBeFalsy();
      expect(component.calendarMonths()[0].isCurrentMonth).toBe(true);
    });
  });

  describe('paging', () => {
    it('should page through months, three, six or twelve at a time or all at once', () => {
      const paginator = query(fixture.debugElement, 'ea-paginator').componentInstance;

      expect(paginator.pageSizeLabel()).toBe('months');
      expect(paginator.pageSizeOptions()).toEqual([3, 6, 12]);
      expect(paginator.showAllOption()).toBe(true);
      expect(paginator.pageSize()).toBe(3);
      expect(paginator.totalItems()).toBe(7);
    });

    it('should pass on the page chosen', () => {
      const pageChangeSpy = vi.spyOn(component.pageChange, 'emit');

      query(fixture.debugElement, 'ea-paginator').triggerEventHandler('changed', {
        page: 2,
        pageSize: 6,
      });

      expect(pageChangeSpy).toHaveBeenCalledWith({ page: 2, pageSize: 6 });
    });
  });

  describe('calendar generation', () => {
    let calendarMonth: CalendarMonth;

    beforeEach(() => {
      calendarMonth = component
        .calendarMonths()
        .find(month => month.monthYear === 'January 2050')!;
    });

    it('should generate calendar month with correct structure', () => {
      expect(calendarMonth.monthYear).toBe('January 2050');
      expect(calendarMonth.hasEvents).toBe(true);
      expect(calendarMonth.weeks.length).toBe(6);

      calendarMonth.weeks.forEach(week => {
        expect(week.length).toBe(7);
      });

      expect(calendarMonth.weeks.flat().filter(day => day.isCurrentMonth).length).toBe(
        31,
      );
    });

    it('should assign events to correct days', () => {
      const dayWithEvent = calendarMonth.weeks.flat().find(day => day.events.length > 0);
      expect(dayWithEvent!.events).toEqual([MOCK_EVENTS[0]]);
    });

    it('should generate correct date keys', () => {
      const firstDayOfMonth = calendarMonth.weeks
        .flat()
        .find(day => day.isCurrentMonth && day.day === 1);

      expect(firstDayOfMonth?.dateKey).toBe('2050-01-01');
    });
  });

  describe('caching behaviour', () => {
    it('should not regenerate calendar months if events have not changed', () => {
      const initialCalendarMonths = component.calendarMonths();

      fixture.detectChanges();

      expect(component.calendarMonths()).toBe(initialCalendarMonths);
    });

    it('should regenerate calendar months if the months change', () => {
      const initialCalendarMonths = component.calendarMonths();

      fixture.componentRef.setInput('months', [...mockMonths, '2050-04', '2050-05']);

      expect(component.calendarMonths().length).toBeGreaterThan(
        initialCalendarMonths.length,
      );
    });
  });

  describe('event indicators', () => {
    it('should list the events of a day, most recently edited first', () => {
      const olderEdit: Event = {
        ...MOCK_EVENTS[1],
        id: 'older-edit',
        eventDate: MOCK_EVENTS[0].eventDate,
        modificationInfo: {
          ...MOCK_EVENTS[1].modificationInfo,
          dateLastEdited: '2020-01-01T00:00:00.000Z',
        },
      };
      const newerEdit: Event = {
        ...olderEdit,
        id: 'newer-edit',
        modificationInfo: {
          ...olderEdit.modificationInfo,
          dateLastEdited: '2021-01-01T00:00:00.000Z',
        },
      };
      fixture.componentRef.setInput('events', [olderEdit, newerEdit]);

      const day = component
        .calendarMonths()[0]
        .weeks.flat()
        .find(calendarDay => calendarDay.events.length);

      expect(day?.events.map(event => event.id)).toEqual(['newer-edit', 'older-edit']);
    });

    it('should open the event details and go to its article when asked to', async () => {
      const router = TestBed.inject(Router);
      const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
      dialogOpenSpy.mockReturnValue(closedDialogRef('details'));

      queryAll(fixture.debugElement, '.event-indicator')[1].triggerEventHandler('click');
      await fixture.whenStable();

      expect(dialogOpenSpy).toHaveBeenCalledWith(EventInfoDialogComponent, {
        inputs: { event: MOCK_EVENTS[1] },
      });
      expect(navigateSpy).toHaveBeenCalledWith([
        '/article/view/',
        MOCK_EVENTS[1].articleId,
      ]);
    });

    it('should stay put when the event details are closed', async () => {
      const navigateSpy = vi.spyOn(TestBed.inject(Router), 'navigate');
      dialogOpenSpy.mockReturnValue(closedDialogRef());

      await component.onEventIndicator(MOCK_EVENTS[1]);

      expect(navigateSpy).not.toHaveBeenCalled();
    });

    it('should show the event in a tooltip, highlighting the search', () => {
      fixture.componentRef.setInput('search', 'champ');
      fixture.detectChanges();
      const [blitz, championship] = queryAll(fixture.debugElement, '.event-indicator');

      blitz.nativeElement.focus();
      fixture.detectChanges();
      const blitzTrophies = tooltip()?.querySelectorAll('.championship-icon').length;
      blitz.nativeElement.blur();
      championship.nativeElement.focus();
      fixture.detectChanges();

      expect(blitzTrophies).toBe(0);
      expect(tooltip()?.querySelector('.event-title')?.textContent).toBe(
        MOCK_EVENTS[1].title,
      );
      expect(tooltip()?.querySelector('lcc-event-type-tag mark')?.textContent).toBe(
        'champ',
      );
      expect(tooltip()?.querySelectorAll('.championship-icon').length).toBe(1);
    });
  });

  describe('template rendering', () => {
    it('should render headers above months', () => {
      const monthElements = queryAll(fixture.debugElement, '.month');
      const headerElements = queryAll(fixture.debugElement, '.month-title');

      expect(monthElements.length).toBe(3);
      expect(
        headerElements.map(headerElement =>
          headerElement.nativeElement.textContent.trim(),
        ),
      ).toEqual(['January 2050', 'February 2050', 'March 2050']);
    });

    it('should render correct number of calendar days', () => {
      // 3 months: 6 weeks each, 7 days per week
      expect(queryAll(fixture.debugElement, '.calendar-day').length).toBe(7 * 6 * 3);

      // 31 days in January, 28 in February (non-leap year), 31 in March
      expect(
        queryAll(fixture.debugElement, '.calendar-day:not(.other-month)').length,
      ).toBe(31 + 28 + 31);
    });

    describe('tooltips on event indicators', () => {
      describe('on desktop', () => {
        let localFixture: ComponentFixture<EventsCalendarGridComponent>;

        beforeEach(() => {
          vi.mocked(TestBed.inject(IS_TOUCH_DEVICE)).mockReturnValue(false);

          localFixture = TestBed.createComponent(EventsCalendarGridComponent);

          setPage(localFixture);

          localFixture.detectChanges();
        });

        it('should render tooltips over event indicators', () => {
          const eventIndicator = query(localFixture.debugElement, '.event-indicator');
          const directiveInstance = eventIndicator.injector.get(TooltipDirective);

          expect(directiveInstance.eaTooltip()).toBeInstanceOf(TemplateRef);
        });
      });

      describe('on mobile', () => {
        let localFixture: ComponentFixture<EventsCalendarGridComponent>;

        beforeEach(() => {
          vi.mocked(TestBed.inject(IS_TOUCH_DEVICE)).mockReturnValue(true);

          localFixture = TestBed.createComponent(EventsCalendarGridComponent);

          setPage(localFixture);

          localFixture.detectChanges();
        });

        it('should not render tooltips over event indicators', () => {
          const eventIndicator = query(localFixture.debugElement, '.event-indicator');
          const directiveInstance = eventIndicator.injector.get(TooltipDirective);

          expect(directiveInstance.eaTooltip()).toBe('');
        });
      });
    });

    describe('while the events load', () => {
      beforeEach(() => {
        fixture.componentRef.setInput('isLoading', true);
        fixture.detectChanges();
      });

      it('should render a skeleton month for each month the page holds', () => {
        const monthsGrid = query(fixture.debugElement, '.months-grid--loading');

        expect(queryAll(monthsGrid, '.month')).toHaveLength(3);
        expect(queryAll(monthsGrid, '.month-title lcc-text-skeleton')).toHaveLength(3);
        expect(monthsGrid.attributes['month-count']).toBe('3');
        expect(monthsGrid.attributes['aria-busy']).toBe('true');
      });

      it('should render enough skeleton months to fill a row on any screen for all months', () => {
        fixture.componentRef.setInput('monthsPerPage', PAGE_SIZE_ALL);
        fixture.detectChanges();

        expect(
          queryAll(fixture.debugElement, '.months-grid--loading .month'),
        ).toHaveLength(12);
      });

      it('should lay each skeleton month out like a calendar month', () => {
        const month = query(fixture.debugElement, '.month');

        expect(
          queryAll(month, '.calendar-grid .day-header').map(header =>
            header.nativeElement.textContent.trim(),
          ),
        ).toEqual(['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']);
        expect(queryAll(month, '.calendar-grid .calendar-day')).toHaveLength(7 * 6);
        expect(
          queryAll(month, '.calendar-day .day-number lcc-text-skeleton'),
        ).toHaveLength(7 * 6);
      });

      it('should not render any event data', () => {
        expect(query(fixture.debugElement, '.event-indicator')).toBeFalsy();
        expect(
          queryAll(fixture.debugElement, '.month-title, .day-number').every(
            element => element.nativeElement.textContent.trim() === '',
          ),
        ).toBe(true);
      });

      it('should render the calendar once the events have loaded', () => {
        fixture.componentRef.setInput('isLoading', false);
        fixture.detectChanges();

        expect(queryAll(fixture.debugElement, '.month')).toHaveLength(3);
        expect(query(fixture.debugElement, 'lcc-text-skeleton')).toBeFalsy();
        expect(query(fixture.debugElement, '.months-grid').attributes['aria-busy']).toBe(
          undefined,
        );
      });
    });
  });
});
