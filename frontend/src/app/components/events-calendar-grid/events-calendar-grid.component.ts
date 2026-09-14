import { CalendarDaysIconComponent, TrophyIconComponent } from '@eagami/ui';
import moment from 'moment-timezone';

import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
  inject,
} from '@angular/core';
import { Router } from '@angular/router';

import { BasicDialogComponent } from '@app/components/basic-dialog/basic-dialog.component';
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
import { DialogService } from '@app/services';
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
    CommonModule,
    FormatDatePipe,
    HighlightPipe,
    KebabCasePipe,
    TooltipDirective,
    TrophyIconComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventsCalendarGridComponent implements OnInit, OnChanges {
  @Input({ required: true }) public events!: Event[];
  @Input({ required: true }) public isAdmin!: boolean;

  @Input() public options?: DataPaginationOptions<Event>;

  @Output() public requestDeleteEvent = new EventEmitter<Event>();

  // Cache computed values to avoid recalculation
  public calendarMonths: CalendarMonth[] = [];
  public isTouchDevice!: boolean;
  private cachedEventsJson = '';

  private readonly isTouchDeviceFn = inject(IS_TOUCH_DEVICE);

  constructor(
    private readonly dialogService: DialogService,
    private readonly router: Router,
  ) {}

  public ngOnInit(): void {
    this.isTouchDevice = this.isTouchDeviceFn();
    this.updateCalendarMonths();
  }

  public ngOnChanges(changes: SimpleChanges<EventsCalendarGridComponent>): void {
    if (changes.events) {
      this.updateCalendarMonths();
    }
  }

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
    };

    const result = await this.dialogService.open<BasicDialogComponent, BasicDialogResult>(
      {
        componentType: BasicDialogComponent,
        inputs: { dialog },
        isModal: true,
      },
    );

    if (result === 'confirm') {
      this.requestDeleteEvent.emit(event);
    }
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

  public get monthYears(): string[] {
    if (!this.events.length) {
      return [];
    }

    const sortedEvents = this.events
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
  }

  public trackWeekByIndex(index: number): number {
    return index;
  }

  private updateCalendarMonths(): void {
    const eventsJson = JSON.stringify(
      this.events.map(event => ({
        id: event.id,
        eventDate: event.eventDate,
        dateLastEdited: event.modificationInfo.dateLastEdited,
      })),
    );

    // Only recalculate if events have actually changed
    if (eventsJson === this.cachedEventsJson) {
      return;
    }

    this.cachedEventsJson = eventsJson;
    this.calendarMonths = this.monthYears.map(monthYear =>
      this.generateCalendarMonth(monthYear),
    );
  }

  private generateCalendarMonth(monthYear: string): CalendarMonth {
    const startOfMonth = moment(monthYear, 'MMMM YYYY').startOf('month');
    const endOfMonth = moment(monthYear, 'MMMM YYYY').endOf('month');
    const today = moment.tz('America/Toronto');

    // Check if this month has any events
    const monthHasEvents = this.events.some(event =>
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
        const dayEvents = this.events
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
