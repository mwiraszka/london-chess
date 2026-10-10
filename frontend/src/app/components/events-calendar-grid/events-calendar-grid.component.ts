import {
  CalendarDaysIconComponent,
  DialogService,
  PAGE_SIZE_ALL,
  PaginatorComponent,
  PaginatorState,
  TooltipDirective,
} from '@eagami/ui';

import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
} from '@angular/core';
import { Router } from '@angular/router';

import { EventTypeTagComponent } from '@app/components/event-type-tag/event-type-tag.component';
import { TextSkeletonComponent } from '@app/components/text-skeleton/text-skeleton.component';
import { CALENDAR_MONTHS_PER_PAGE } from '@app/constants/filters';
import { AdminControlsDirective } from '@app/directives/admin-controls.directive';
import { AdminControlsConfig, CalendarDay, CalendarMonth, Event } from '@app/models';
import { FormatDatePipe, HighlightPipe, KebabCasePipe } from '@app/pipes';
import { DeletionService } from '@app/services';
import { IS_TOUCH_DEVICE } from '@app/tokens';
import { clubToday, customSort, dayKeyOf } from '@app/utils';
import moment from '@app/utils/datetime/moment';

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
  private readonly deletion = inject(DeletionService);
  private readonly dialogService = inject(DialogService);
  private readonly router = inject(Router);

  // The events in the months shown, each month as 'YYYY-MM'
  public readonly events = input.required<Event[]>();
  public readonly months = input.required<string[]>();
  public readonly monthCount = input.required<number>();
  public readonly page = input.required<number>();
  public readonly monthsPerPage = input.required<number>();
  public readonly isAdmin = input.required<boolean>();

  public readonly isLoading = input(false);
  public readonly search = input('');

  public readonly pageChange = output<PaginatorState>();

  protected readonly monthsPerPageOptions = CALENDAR_MONTHS_PER_PAGE;
  protected readonly daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  // As many as the page holds, up to a row on any screen; the stylesheet shows only
  // those that fit in it
  protected readonly skeletonMonths = computed(() => {
    const monthsPerPage = this.monthsPerPage();
    const count = monthsPerPage === PAGE_SIZE_ALL ? 12 : Math.min(monthsPerPage, 12);
    return Array.from({ length: count }, (_, index) => index);
  });
  // Six weeks, the most a month can span
  protected readonly skeletonDays = Array.from({ length: 42 }, (_, index) => index);
  protected readonly isTouchDevice = inject(IS_TOUCH_DEVICE)();

  private readonly eventsByDay = computed(() => {
    const eventsByDay = new Map<string, Event[]>();
    for (const event of this.events()) {
      const dayKey = dayKeyOf(event.eventDate);
      eventsByDay.set(dayKey, [...(eventsByDay.get(dayKey) ?? []), event]);
    }
    for (const dayEvents of eventsByDay.values()) {
      dayEvents.sort((a, b) => customSort(a, b, 'modificationInfo.dateLastEdited', true));
    }
    return eventsByDay;
  });

  public readonly calendarMonths = computed<CalendarMonth[]>(() =>
    this.months().map(month => this.generateCalendarMonth(month)),
  );

  public getAdminControlsConfig(event: Event): AdminControlsConfig {
    return {
      buttonSize: 34,
      deleteCb: () => this.deletion.deleteEvent(event),
      editPath: ['event', 'edit', event.id],
      itemName: event.title,
    };
  }

  public async onEventIndicator(event: Event): Promise<void> {
    const result = await this.dialogService.open<'details'>(EventInfoDialogComponent, {
      inputs: { event },
    }).result;

    if (result === 'details') {
      this.router.navigate(['/article/view/', event.articleId]);
    }
  }

  // Six weeks from the Sunday on or before the 1st, enough for any month's layout
  private generateCalendarMonth(month: string): CalendarMonth {
    const eventsByDay = this.eventsByDay();
    const today = clubToday();
    const startOfMonth = moment(month, 'YYYY-MM');
    const date = startOfMonth.clone().startOf('week');

    const weeks: CalendarDay[][] = [];
    for (let week = 0; week < 6; week++) {
      const weekDays: CalendarDay[] = [];
      for (let day = 0; day < 7; day++) {
        const dateKey = date.format('YYYY-MM-DD');
        weekDays.push({
          day: date.date(),
          isCurrentMonth: dateKey.startsWith(month),
          isToday: dateKey === today,
          dateKey,
          events: eventsByDay.get(dateKey) ?? [],
        });
        date.add(1, 'day');
      }
      weeks.push(weekDays);
    }

    return {
      monthYear: startOfMonth.format('MMMM YYYY'),
      hasEvents: weeks.some(weekDays =>
        weekDays.some(day => day.isCurrentMonth && day.events.length > 0),
      ),
      isCurrentMonth: today.startsWith(month),
      weeks,
    };
  }
}
