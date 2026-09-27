import { CalendarDaysIconComponent, TrophyIconComponent } from '@eagami/ui';
import moment from 'moment-timezone';

import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core';
import { Router } from '@angular/router';

import { BasicDialogComponent } from '@app/components/basic-dialog/basic-dialog.component';
import { TextSkeletonComponent } from '@app/components/text-skeleton/text-skeleton.component';
import { AdminControlsDirective } from '@app/directives/admin-controls.directive';
import { TooltipDirective } from '@app/directives/tooltip.directive';
import {
  AdminControlsConfig,
  BasicDialogResult,
  CalendarDay,
  CalendarMonth,
  DataPaginationOptions,
  Dialog,
  Event,
} from '@app/models';
import { FormatDatePipe, HighlightPipe, KebabCasePipe } from '@app/pipes';
import { DialogService, StoreRequestService } from '@app/services';
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
    FormatDatePipe,
    HighlightPipe,
    KebabCasePipe,
    TextSkeletonComponent,
    TooltipDirective,
    TrophyIconComponent,
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
  public readonly options = input<DataPaginationOptions<Event>>();

  protected readonly daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  protected readonly skeletonMonths = [0, 1, 2];
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

    const monthYears: string[] = [];
    const current = firstEventDate.clone().startOf('month');
    const end = lastEventDate.clone().startOf('month');

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

    await this.dialogService.open<BasicDialogComponent, BasicDialogResult>({
      componentType: BasicDialogComponent,
      inputs: { dialog },
      isModal: true,
    });
  }

  public async onEventIndicator(event: Event): Promise<void> {
    const result = await this.dialogService.open<EventInfoDialogComponent, 'details'>({
      componentType: EventInfoDialogComponent,
      inputs: { event },
      isModal: true,
    });

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
