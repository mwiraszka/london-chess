import moment from 'moment-timezone';

import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

import { query, queryAll, queryTextContent } from '@app/utils';

import { DatePickerComponent } from './date-picker.component';

@Component({
  template: `<lcc-date-picker [formControl]="control" />`,
  imports: [DatePickerComponent, ReactiveFormsModule],
})
class HostComponent {
  readonly control = new FormControl('2050-01-01T00:00:00.000Z', { nonNullable: true });
}

describe('DatePickerComponent', () => {
  let fixture: ComponentFixture<DatePickerComponent>;
  let component: DatePickerComponent;

  let onChangeSpy: MockInstance;
  let onNextMonthSpy: MockInstance;
  let onPreviousMonthSpy: MockInstance;
  let renderCalendarSpy: MockInstance;

  const innerWidth = window.innerWidth;

  const resizeWindow = (width: number): void => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });
    window.dispatchEvent(new Event('resize'));
    fixture.detectChanges();
  };

  beforeAll(() => moment.tz.setDefault('UTC'));
  afterAll(() => moment.tz.setDefault());

  afterEach(() => {
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: innerWidth,
    });
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DatePickerComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(DatePickerComponent);
    component = fixture.componentInstance;

    // @ts-expect-error Private class member
    onChangeSpy = vi.spyOn(component, 'onChange');
    onNextMonthSpy = vi.spyOn(component, 'onNextMonth');
    onPreviousMonthSpy = vi.spyOn(component, 'onPreviousMonth');
    renderCalendarSpy = vi.spyOn(component, 'renderCalendar');

    component.writeValue('2050-01-01T00:00:00.000Z');
    component.screenWidth.set(1000);
    fixture.detectChanges();

    vi.clearAllMocks();
  });

  describe('value', () => {
    it("should fall back to today's date without a value", () => {
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(new Date('2051-06-15T12:00:00.000Z'));
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

      component.writeValue('');
      fixture.detectChanges();

      expect(warnSpy).toHaveBeenCalled();
      expect(queryTextContent(fixture.debugElement, '.title')).toBe('June 2051');
      expect(queryTextContent(fixture.debugElement, '.selected-day')).toBe('15');
    });

    it('should show the month of a date selected from outside', () => {
      component.setSelectedDate('2050-03-20T00:00:00.000Z');
      fixture.detectChanges();

      expect(queryTextContent(fixture.debugElement, '.title')).toBe('March 2050');
      expect(queryTextContent(fixture.debugElement, '.selected-day')).toBe('20');
    });

    it('should not build a calendar before it has a value', () => {
      const unset = TestBed.createComponent(DatePickerComponent).componentInstance;

      unset.renderCalendar();

      expect(unset.calendarDays).toEqual([]);
    });
  });

  describe('template rendering', () => {
    describe('header', () => {
      it('should render the currently selected month and year as the title', () => {
        expect(queryTextContent(fixture.debugElement, '.title')).toBe('January 2050');
      });

      it('should shorten the month text on small screens', () => {
        resizeWindow(300);

        expect(queryTextContent(fixture.debugElement, '.title')).toBe('Jan 2050');
      });

      it('should subtract one month when previous month button is clicked', () => {
        query(fixture.debugElement, '.previous-month-button').triggerEventHandler(
          'click',
        );

        expect(onPreviousMonthSpy).toHaveBeenCalledTimes(1);
        expect(renderCalendarSpy).toHaveBeenCalledTimes(1);
        expect(moment(component.currentMonth).format('MMMM YYYY')).toBe('December 2049');
      });

      it('should add one month when next month button is clicked', () => {
        query(fixture.debugElement, '.next-month-button').triggerEventHandler('click');

        expect(onNextMonthSpy).toHaveBeenCalledTimes(1);
        expect(renderCalendarSpy).toHaveBeenCalledTimes(1);
        expect(moment(component.currentMonth).format('MMMM YYYY')).toBe('February 2050');
      });
    });

    describe('calendar table', () => {
      it('should render a 7 x 6 table for every month, regardless of number of days', () => {
        const table = query(fixture.debugElement, '.calendar-table');
        const headerCells = queryAll(table, 'thead th');
        const bodyRows = queryAll(table, 'tbody tr');
        const dayCells = queryAll(table, 'tbody tr td');

        expect(table).toBeTruthy();
        expect(headerCells.length).toBe(component.DAYS_OF_WEEK.length);
        expect(headerCells[0].nativeElement.textContent).toBe('Sun');
        expect(headerCells[6].nativeElement.textContent).toBe('Sat');
        expect(bodyRows.length).toBe(component.WEEKS_IN_CALENDAR);
        // 7 days x 6 weeks = 42 day cells
        expect(dayCells.length).toBe(42);
      });

      it('should mark days outside current month as disabled', () => {
        let disabledCount = 0;

        component.calendarDays.forEach(week => {
          week.forEach(day => {
            if (day.disabled) {
              disabledCount++;
            }
          });
        });

        // January 2050 starts on a Saturday, so first week has 6 days from previous month;
        // ends on a Monday, so last 5 days are from the following month.
        expect(disabledCount).toBe(11);
      });

      it('should highlight the selected date', () => {
        const day15 = queryAll(fixture.debugElement, 'tbody td').find(
          cell => cell.nativeElement.textContent.trim() === '15',
        );
        day15!.triggerEventHandler('click');
        fixture.detectChanges();
        expect(queryTextContent(fixture.debugElement, '.selected-day')).toBe('15');
      });

      it('should update selected date when a day is clicked', () => {
        component.writeValue('2050-01-01T00:00:00.000Z');
        fixture.detectChanges();

        // Click the cell containing day 2
        const dayCells = queryAll(fixture.debugElement, 'tbody td');
        const day2Cell = dayCells.find(
          cell => cell.nativeElement.textContent.trim() === '2',
        );
        day2Cell!.triggerEventHandler('click');
        fixture.detectChanges();

        expect(onChangeSpy).toHaveBeenCalledWith('2050-01-02T00:00:00.000Z');
        expect(query(fixture.debugElement, '.selected-day')).toBeTruthy();
      });

      it('should display the selected date in the footer', () => {
        const day15 = queryAll(fixture.debugElement, 'tbody td').find(
          cell => cell.nativeElement.textContent.trim() === '15',
        );
        day15!.triggerEventHandler('click');
        fixture.detectChanges();

        expect(queryTextContent(fixture.debugElement, '.selected-date')).toBe(
          'Saturday, January 15th 2050',
        );

        resizeWindow(300);

        expect(queryTextContent(fixture.debugElement, '.selected-date')).toBe(
          'Sat, Jan 15th 2050',
        );
      });
    });
  });

  it('should work as a form control', () => {
    const hostFixture = TestBed.createComponent(HostComponent);
    hostFixture.detectChanges();

    queryAll(hostFixture.debugElement, 'tbody td')
      .find(cell => cell.nativeElement.textContent.trim() === '9')
      ?.triggerEventHandler('click');

    expect(hostFixture.componentInstance.control.value).toBe('2050-01-09T00:00:00.000Z');
  });
});
