import {
  CalendarDaysIconComponent,
  DialogService,
  PaginatorComponent,
  PaginatorState,
  TooltipDirective,
} from '@eagami/ui';
import moment from 'moment-timezone';

import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
} from '@angular/core';
import { Router } from '@angular/router';

import { BasicDialogComponent } from '@app/components/basic-dialog/basic-dialog.component';
import { EventTypeTagComponent } from '@app/components/event-type-tag/event-type-tag.component';
import { TextSkeletonComponent } from '@app/components/text-skeleton/text-skeleton.component';
import { EVENTS_PAGE_SIZES } from '@app/constants/events-table';
import { AdminControlsDirective } from '@app/directives/admin-controls.directive';
import {
  AdminControlsConfig,
  CalendarDay,
  CalendarMonth,
  DataPaginationOptions,
  Dialog,
  Event,
} from '@app/models';
import { FormatDatePipe, HighlightPipe, KebabCasePipe } from '@app/pipes';
import { StoreRequestService } from '@app/services';
import { EventsActions } from '@app/store/events';
import { IS_TOUCH_DEVICE } from '@app/tokens';
import { customSort } from '@app/utils';

import { EventInfoDialogComponent } from '../event-info-dialog/event-info-dialog.component';

@Component({
  selector: 'lcc-events-calendar-grid',
  templateUrl: './events-calendar-grid.component.html',
  styleUrl: './events-calendar-grid.component.scss',
  imports: [
    AdminControlsDirective,
    CalendarDaysIconComponent,
    EventTypeTagComponent,
    FormatDatePipe,
    HighlightPipe,
    KebabCasePipe,
    PaginatorComponent,
    TextSkeletonComponent,
    TooltipDirective,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventsCalendarGridComponent {
  private readonly dialogService = inject(DialogService);
  private readonly router = inject(Router);
  private readonly storeRequests = inject(StoreRequestService);

  public readonly events = input.required<Event[]>();
  public readonly isAdmin = input.required<boolean>();

  public readonly isLoading = input(false);
  // With the options the calendar pages its events, through their change
  public readonly options = input<DataPaginationOptions<Event>>();
  public readonly filteredCount = input<number | null>(null);

  public readonly optionsChange = output<DataPaginationOptions<Event>>();

  protected readonly pageSizes = EVENTS_PAGE_SIZES;
  protected readonly daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  // Enough to fill a row on any screen; the stylesheet shows only those that fit in it
  protected readonly skeletonMonths = Array.from({ length: 12 }, (_, index) => index);
  // Six weeks, the most a month can span
  protected readonly skeletonDays = Array.from({ length: 42 }, (_, index) => index);
  protected readonly isTouchDevice = inject(IS_TOUCH_DEVICE)();

  public readonly monthYears = computed<string[]>(() => {
    const events = this.events();
    if (!events.length) {
      return [];
    }

    const sortedEvents = events
      .map(event => moment(event.eventDate))
      .sort((a, b) => a.valueOf() - b.valueOf());

    const firstEventDate = sortedEvents[0];
    const lastEventDate = sortedEvents[sortedEvents.length - 1];
    const today = moment.tz('America/Toronto');

    // The first page reaches back to today, so the calendar always shows where it is
    const isFirstPage = (this.options()?.page ?? 1) === 1;
    const start = isFirstPage && today.isBefore(firstEventDate) ? today : firstEventDate;

    // Today is the club's while the events are local, so each is reduced to its calendar
    // month before the two are compared
    const monthYears: string[] = [];
    const current = moment(start.format('YYYY-MM'), 'YYYY-MM');
    const end = moment(lastEventDate.format('YYYY-MM'), 'YYYY-MM');

    while (current.isSameOrBefore(end, 'month')) {
      monthYears.push(current.format('MMMM YYYY'));
      current.add(1, 'month');
    }

    return monthYears;
  });

  public readonly calendarMonths = computed<CalendarMonth[]>(() =>
    this.monthYears().map(monthYear => this.generateCalendarMonth(monthYear)),
  );

  public getAdminControlsConfig(event: Event): AdminControlsConfig {
    return {
      buttonSize: 34,
      deleteCb: () => this.onDeleteEvent(event),
      editPath: ['event', 'edit', event.id],
      itemName: event.title,
    };
  }

  public onPageChanged({ page, pageSize }: PaginatorState): void {
    const options = this.options();
    if (options) {
      this.optionsChange.emit({ ...options, page, pageSize });
    }
  }

  public async onDeleteEvent(event: Event): Promise<void> {
    const dialog: Dialog = {
      title: 'Confirm',
      body: `Delete ${event.title}?`,
      confirmButtonText: 'Delete',
      confirmButtonType: 'warning',
      confirmAction: () =>
        this.storeRequests.dispatch(EventsActions.deleteEventRequested({ event }), [
          EventsActions.deleteEventSucceeded,
          EventsActions.deleteEventFailed,
        ]),
    };

    await this.dialogService.open(BasicDialogComponent, { inputs: { dialog } }).result;
  }

  public async onEventIndicator(event: Event): Promise<void> {
    const result = await this.dialogService.open<'details'>(EventInfoDialogComponent, {
      inputs: { event },
    }).result;

    if (result === 'details') {
      this.router.navigate(['/article/view/', event.articleId]);
    }
  }

  public trackWeekByIndex(index: number): number {
    return index;
  }

  private generateCalendarMonth(monthYear: string): CalendarMonth {
    const events = this.events();
    const startOfMonth = moment(monthYear, 'MMMM YYYY').startOf('month');
    const endOfMonth = moment(monthYear, 'MMMM YYYY').endOf('month');
    const today = moment.tz('America/Toronto');

    // Check if this month has any events
    const monthHasEvents = events.some(event =>
      moment(event.eventDate).isBetween(startOfMonth, endOfMonth, 'day', '[]'),
    );

    // Check if today falls within this month
    const isCurrentMonth = today.isBetween(startOfMonth, endOfMonth, 'day', '[]');

    // Start from Sunday of the week containing the first day of the month
    const startOfCalendar = startOfMonth.clone().startOf('week');

    // Generate 6 weeks (42 days) to ensure all possible month layouts are covered
    const weeks: CalendarDay[][] = [];
    const currentDate = startOfCalendar.clone();

    for (let week = 0; week < 6; week++) {
      const weekDays: CalendarDay[] = [];

      for (let day = 0; day < 7; day++) {
        const isCurrentMonth = currentDate.isBetween(
          startOfMonth,
          endOfMonth,
          'day',
          '[]',
        );
        const isToday = currentDate.isSame(today, 'day');
        const dayEvents = events
          .filter(event => moment(event.eventDate).isSame(currentDate, 'day'))
          .sort((a, b) => customSort(a, b, 'modificationInfo.dateLastEdited', true));

        const dateKey = currentDate.format('YYYY-MM-DD');

        weekDays.push({
          day: currentDate.date(),
          isCurrentMonth,
          isToday,
          date: currentDate.clone(),
          dateKey,
          events: dayEvents,
        });

        currentDate.add(1, 'day');
      }

      weeks.push(weekDays);
    }

    return {
      monthYear,
      hasEvents: monthHasEvents,
      isCurrentMonth,
      weeks,
    };
  }
}
