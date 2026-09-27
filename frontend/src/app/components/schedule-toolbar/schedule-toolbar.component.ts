import {
  ButtonComponent,
  CalendarCheckIconComponent,
  CalendarIconComponent,
  SwitchComponent,
} from '@eagami/ui';
import { UntilDestroy } from '@ngneat/until-destroy';

import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  inject,
  input,
  output,
} from '@angular/core';

import { BasicDialogComponent } from '@app/components/basic-dialog/basic-dialog.component';
import { BasicDialogResult, Dialog, Event } from '@app/models';
import { DialogService } from '@app/services';
import { EXPORT_EVENTS_TO_ICAL } from '@app/tokens';

@UntilDestroy()
@Component({
  selector: 'lcc-schedule-toolbar',
  template: `
    <ea-button
      class="schedule-toolbar__today"
      variant="ghost"
      size="md"
      [disabled]="!todayScrollPoint"
      [icon]="todayIcon"
      (clicked)="onToday()">
      Today
    </ea-button>

    <ea-switch
      class="schedule-toolbar__view"
      label="Calendar view"
      [checked]="scheduleView() === 'calendar'"
      (changed)="toggleScheduleView.emit()" />

    <ea-button
      class="schedule-toolbar__export"
      variant="ghost"
      size="md"
      [disabled]="!filteredEvents().length"
      [icon]="exportIcon"
      (clicked)="onExportToIcal()">
      Export to iCalendar
    </ea-button>
  `,
  styleUrl: './schedule-toolbar.component.scss',
  imports: [ButtonComponent, SwitchComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScheduleToolbarComponent {
  readonly changeDetectorRef = inject(ChangeDetectorRef);
  private readonly dialogService = inject(DialogService);

  public readonly filteredEvents = input.required<Event[]>();
  public readonly scheduleView = input.required<'list' | 'calendar'>();
  public readonly totalCount = input.required<number>();

  public readonly toggleScheduleView = output<void>();

  protected readonly todayIcon = CalendarIconComponent;
  protected readonly exportIcon = CalendarCheckIconComponent;

  private readonly exportEventsToIcal = inject(EXPORT_EVENTS_TO_ICAL);

  public get todayScrollPoint(): Element | null {
    return document.querySelector('.schedule-view.active .today-scroll-point');
  }

  public onToday(): void {
    const point = this.todayScrollPoint;
    // The row the point sits in, so the line along its top edge comes into view too
    const target = point?.closest('tr') ?? point;
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  public async onExportToIcal(): Promise<void> {
    const filteredEvents = this.filteredEvents();
    const totalCount = this.totalCount();
    const body1 =
      filteredEvents.length === totalCount
        ? `All ${totalCount}`
        : `The ${filteredEvents.length} currently visible`;
    const body2 = `${this.filteredEvents().length === 1 ? 'event' : 'events'}`;
    const body3 =
      'will be exported to an iCalendar file, which can then be imported into Google Calendar, Apple Calendar or Microsoft Outlook.';

    const dialog: Dialog = {
      title: 'Confirm',
      body: `${body1} ${body2} ${body3}`,
      confirmButtonText: 'Export',
      confirmButtonType: 'primary',
    };

    const dialogResult = await this.dialogService.open<
      BasicDialogComponent,
      BasicDialogResult
    >({
      componentType: BasicDialogComponent,
      inputs: { dialog },
      isModal: false,
    });

    if (dialogResult !== 'confirm') {
      return;
    }

    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `london_chess_club_events_${timestamp}.ics`;

    this.exportEventsToIcal(this.filteredEvents(), filename);
  }
}
