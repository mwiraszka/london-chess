import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { BasicDialogComponent } from '@app/components/basic-dialog/basic-dialog.component';
import { AdminControlsDirective } from '@app/directives/admin-controls.directive';
import { TooltipDirective } from '@app/directives/tooltip.directive';
import { MOCK_EVENTS } from '@app/mocks/events.mock';
import { CalendarMonth, DataPaginationOptions, Event } from '@app/models';
import { FormatDatePipe, HighlightPipe, KebabCasePipe } from '@app/pipes';
import { DialogService } from '@app/services';
import { IS_TOUCH_DEVICE } from '@app/tokens';
import { query, queryAll } from '@app/utils';

import { EventsCalendarGridComponent } from './events-calendar-grid.component';

describe('EventsCalendarGridComponent', () => {
  let fixture: ComponentFixture<EventsCalendarGridComponent>;
  let component: EventsCalendarGridComponent;

  let dialogService: DialogService;

  let dialogOpenSpy: MockInstance;
  let requestDeleteEventSpy: MockInstance;
  let updateCalendarMonthsSpy: MockInstance;

  const mockEvents = MOCK_EVENTS.slice(0, 2);
  const mockIsAdmin = true;
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

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        AdminControlsDirective,
        EventsCalendarGridComponent,
        FormatDatePipe,
        HighlightPipe,
        KebabCasePipe,
        TooltipDirective,
      ],
      providers: [
        { provide: IS_TOUCH_DEVICE, useValue: vi.fn() },
        {
          provide: DialogService,
          useValue: { open: vi.fn() },
        },
        provideRouter([{ path: 'article/view/:id', component: class {} }]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(EventsCalendarGridComponent);
    component = fixture.componentInstance;

    dialogService = TestBed.inject(DialogService);

    dialogOpenSpy = vi.spyOn(dialogService, 'open');
    requestDeleteEventSpy = vi.spyOn(component.requestDeleteEvent, 'emit');
    // @ts-expect-error Private class member
    updateCalendarMonthsSpy = vi.spyOn(component, 'updateCalendarMonths');

    fixture.componentRef.setInput('events', mockEvents);
    fixture.componentRef.setInput('isAdmin', mockIsAdmin);
    fixture.componentRef.setInput('options', mockOptions);

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('calendar months update', () => {
    it('should update on init', () => {
      updateCalendarMonthsSpy.mockClear();
      component.ngOnInit();

      expect(updateCalendarMonthsSpy).toHaveBeenCalledTimes(1);
      expect(component.calendarMonths.length).toBeGreaterThan(0);
    });

    it('should update when events change', () => {
      const initialLength = component.calendarMonths.length;

      fixture.componentRef.setInput('events', MOCK_EVENTS.slice(0, 4));
      component.ngOnChanges({
        events: {
          currentValue: MOCK_EVENTS.slice(0, 4),
          previousValue: mockEvents,
          firstChange: false,
          isFirstChange: () => false,
        },
      });
      fixture.detectChanges();

      expect(component.calendarMonths.length).toBeGreaterThan(initialLength);
    });

    it('should not update when non-events properties change', () => {
      const initialCalendarMonths = component.calendarMonths;

      component.ngOnChanges({
        isAdmin: {
          currentValue: false,
          previousValue: true,
          firstChange: false,
          isFirstChange: () => false,
        },
      });

      expect(component.calendarMonths).toBe(initialCalendarMonths);
    });
  });

  describe('getAdminControlsConfig', () => {
    it('should return correct configuration for event', () => {
      const config = component.getAdminControlsConfig(mockEvents[0]);

      expect(config.buttonSize).toBe(34);
      expect(config.editPath).toEqual(['event', 'edit', mockEvents[0].id]);
      expect(config.itemName).toBe(mockEvents[0].title);
      expect(config.deleteCb).toBeDefined();
    });
  });

  describe('onDeleteEvent', () => {
    it('should open confirmation dialog with correct parameters', async () => {
      dialogOpenSpy.mockResolvedValue('cancel');

      await component.onDeleteEvent(mockEvents[0]);

      expect(dialogOpenSpy).toHaveBeenCalledWith({
        componentType: BasicDialogComponent,
        inputs: {
          dialog: {
            title: 'Confirm',
            body: `Delete ${mockEvents[0].title}?`,
            confirmButtonText: 'Delete',
            confirmButtonType: 'warning',
          },
        },
        isModal: true,
      });
    });

    it('should emit requestDeleteEvent when user confirms', async () => {
      dialogOpenSpy.mockResolvedValue('confirm');
      await component.onDeleteEvent(mockEvents[0]);

      expect(requestDeleteEventSpy).toHaveBeenCalledWith(mockEvents[0]);
    });

    it('should not emit requestDeleteEvent when user cancels', async () => {
      dialogOpenSpy.mockResolvedValue('cancel');
      await component.onDeleteEvent(mockEvents[0]);

      expect(requestDeleteEventSpy).not.toHaveBeenCalled();
    });
  });

  describe('monthYears getter', () => {
    it('should return empty array when no events', () => {
      fixture.componentRef.setInput('events', []);

      component.ngOnChanges({
        events: {
          currentValue: [],
          previousValue: mockEvents,
          firstChange: false,
          isFirstChange: () => false,
        },
      });

      expect(component.monthYears).toEqual([]);
    });

    it('should return correct month years for events', () => {
      expect(component.monthYears).toEqual([
        'January 2050',
        'February 2050',
        'March 2050',
      ]);
    });
  });

  describe('trackWeekByIndex', () => {
    it('should return the index', () => {
      expect(component.trackWeekByIndex(0)).toBe(0);
      expect(component.trackWeekByIndex(5)).toBe(5);
    });
  });

  describe('calendar generation', () => {
    let calendarMonth: CalendarMonth;

    beforeEach(() => {
      calendarMonth = component.calendarMonths.find(
        month => month.monthYear === 'January 2050',
      )!;
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
      const initialCalendarMonths = component.calendarMonths;

      component.ngOnChanges({
        events: {
          currentValue: mockEvents,
          previousValue: mockEvents,
          firstChange: false,
          isFirstChange: () => false,
        },
      });

      expect(component.calendarMonths).toBe(initialCalendarMonths);
    });

    it('should regenerate calendar months if events change', () => {
      const initialCalendarMonths = component.calendarMonths;

      const modifiedEvents = MOCK_EVENTS.slice(0, 5);

      fixture.componentRef.setInput('events', modifiedEvents);
      component.ngOnChanges({
        events: {
          currentValue: modifiedEvents,
          previousValue: mockEvents,
          firstChange: false,
          isFirstChange: () => false,
        },
      });

      expect(component.calendarMonths.length).toBeGreaterThan(
        initialCalendarMonths.length,
      );
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

          localFixture.componentRef.setInput('events', mockEvents);
          localFixture.componentRef.setInput('isAdmin', mockIsAdmin);
          localFixture.componentRef.setInput('options', mockOptions);

          localFixture.detectChanges();
        });

        it('should render tooltips over event indicators', () => {
          const eventIndicator = query(localFixture.debugElement, '.event-indicator');
          const directiveInstance = eventIndicator.injector.get(TooltipDirective);

          expect(directiveInstance.tooltip).toBeTruthy();
        });
      });

      describe('on mobile', () => {
        let localFixture: ComponentFixture<EventsCalendarGridComponent>;

        beforeEach(() => {
          vi.mocked(TestBed.inject(IS_TOUCH_DEVICE)).mockReturnValue(true);

          localFixture = TestBed.createComponent(EventsCalendarGridComponent);

          localFixture.componentRef.setInput('events', mockEvents);
          localFixture.componentRef.setInput('isAdmin', mockIsAdmin);
          localFixture.componentRef.setInput('options', mockOptions);

          localFixture.detectChanges();
        });

        it('should not render tooltips over event indicators', () => {
          const eventIndicator = query(localFixture.debugElement, '.event-indicator');
          const directiveInstance = eventIndicator.injector.get(TooltipDirective);

          expect(directiveInstance.tooltip).toBeFalsy();
        });
      });
    });
  });
});
