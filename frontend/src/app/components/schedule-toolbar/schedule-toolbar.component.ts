import {
  CalendarCheckIconComponent,
  GridIconComponent,
  RowsIconComponent,
} from '@eagami/ui';
import { UntilDestroy } from '@ngneat/until-destroy';

import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  Output,
  inject,
} from '@angular/core';

import { BasicDialogComponent } from '@app/components/basic-dialog/basic-dialog.component';
import { ToggleSwitchComponent } from '@app/components/toggle-switch/toggle-switch.component';
import { TooltipDirective } from '@app/directives/tooltip.directive';
import { BasicDialogResult, Dialog, Event } from '@app/models';
import { DialogService } from '@app/services';
import { EXPORT_EVENTS_TO_ICAL } from '@app/tokens';

@UntilDestroy()
@Component({
  selector: 'lcc-schedule-toolbar',
  template: `
    <button
      class="today-button lcc-secondary-button"
      [disabled]="!todayScrollPoint"
      tooltip="Scroll to today"
      (click)="onToday()">
      today
    </button>

    <lcc-toggle-switch
      [iconWhenOff]="listViewIcon"
      [iconWhenOn]="calendarViewIcon"
      [switchedOn]="scheduleView === 'calendar'"
      tooltipWhenOff="View as calendar"
      tooltipWhenOn="View as list"
      (toggle)="toggleScheduleView.emit()">
    </lcc-toggle-switch>

    <button
      class="export-to-ical-button lcc-secondary-button"
      [disabled]="!filteredEvents.length"
      (click)="onExportToIcal()"
      tooltip="Export events to iCalendar">
      <ea-icon-calendar-check />
    </button>
  `,
  styleUrl: './schedule-toolbar.component.scss',
  imports: [CalendarCheckIconComponent, ToggleSwitchComponent, TooltipDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScheduleToolbarComponent {
  @Input({ required: true }) public filteredEvents!: Event[];
  @Input({ required: true }) public scheduleView!: 'list' | 'calendar';
  @Input({ required: true }) public totalCount!: number;

  @Output() public readonly toggleScheduleView = new EventEmitter<void>();

  protected readonly calendarViewIcon = GridIconComponent;
  protected readonly listViewIcon = RowsIconComponent;

  private readonly exportEventsToIcal = inject(EXPORT_EVENTS_TO_ICAL);

  constructor(
    public readonly changeDetectorRef: ChangeDetectorRef,
    private readonly dialogService: DialogService,
  ) {}

  public get todayScrollPoint(): Element | null {
    return document.querySelector('.schedule-view.active .today-scroll-point');
  }

  public onToday(): void {
    if (this.todayScrollPoint) {
      this.todayScrollPoint.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }
  }

  public async onExportToIcal(): Promise<void> {
    const body1 =
      this.filteredEvents.length === this.totalCount
        ? `All ${this.totalCount}`
        : `The ${this.filteredEvents.length} currently visible`;
    const body2 = `${this.filteredEvents.length === 1 ? 'event' : 'events'}`;
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

    this.exportEventsToIcal(this.filteredEvents, filename);
  }
}
