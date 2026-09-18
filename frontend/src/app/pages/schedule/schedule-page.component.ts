import {
  CalendarDaysIconComponent,
  DownloadIconComponent,
  PlusCircleIconComponent,
} from '@eagami/ui';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { Store } from '@ngrx/store';
import { Observable, combineLatest, firstValueFrom } from 'rxjs';
import { map, tap } from 'rxjs/operators';

import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  ViewChild,
  inject,
} from '@angular/core';

import { AdminToolbarComponent } from '@app/components/admin-toolbar/admin-toolbar.component';
import { BasicDialogComponent } from '@app/components/basic-dialog/basic-dialog.component';
import { DataToolbarComponent } from '@app/components/data-toolbar/data-toolbar.component';
import { EventsCalendarGridComponent } from '@app/components/events-calendar-grid/events-calendar-grid.component';
import { EventsTableComponent } from '@app/components/events-table/events-table.component';
import { LoadFailedComponent } from '@app/components/load-failed/load-failed.component';
import { PageHeaderComponent } from '@app/components/page-header/page-header.component';
import { ScheduleToolbarComponent } from '@app/components/schedule-toolbar/schedule-toolbar.component';
import {
  AdminButton,
  BasicDialogResult,
  DataPaginationOptions,
  Dialog,
  Event,
  InternalLink,
  LoadStatus,
} from '@app/models';
import { DialogService, MetaAndTitleService, StoreRequestService } from '@app/services';
import { AuthSelectors } from '@app/store/auth';
import { EventsActions, EventsSelectors } from '@app/store/events';

@UntilDestroy()
@Component({
  selector: 'lcc-schedule-page',
  template: `
    @if (viewModel$ | async; as vm) {
      <lcc-page-header
        heading="Schedule"
        [icon]="pageIcon">
      </lcc-page-header>

      @if (vm.isAdmin) {
        <lcc-admin-toolbar
          [adminLinks]="[addEventLink]"
          [adminButtons]="[exportToCsvButton]">
        </lcc-admin-toolbar>
      }

      <lcc-data-toolbar
        entity="event"
        [filteredCount]="vm.filteredCount"
        [options]="vm.options"
        searchPlaceholder="Search by event type or name"
        (optionsChange)="onOptionsChange($event)"
        (optionsChangeNoFetch)="onOptionsChange($event, false)">
      </lcc-data-toolbar>

      <lcc-schedule-toolbar
        [filteredEvents]="vm.filteredEvents"
        [scheduleView]="vm.scheduleView"
        [totalCount]="vm.totalCount"
        (toggleScheduleView)="onToggleScheduleView()">
      </lcc-schedule-toolbar>

      @if (vm.status === 'failed') {
        <lcc-load-failed
          title="Unable to load the schedule"
          (retry)="onRetry()" />
      } @else if (vm.filteredCount || vm.status === 'loading') {
        <lcc-events-table
          class="schedule-view"
          [class.active]="vm.scheduleView === 'list'"
          [events]="vm.filteredEvents"
          [isAdmin]="vm.isAdmin"
          [isLoading]="vm.status === 'loading'"
          [nextEvent]="vm.nextEvent"
          [options]="vm.options"
          [showModificationInfo]="vm.isAdmin">
        </lcc-events-table>

        <lcc-events-calendar-grid
          class="schedule-view"
          [class.active]="vm.scheduleView === 'calendar'"
          [events]="vm.filteredEvents"
          [isAdmin]="vm.isAdmin"
          [isLoading]="vm.status === 'loading'"
          [options]="vm.options">
        </lcc-events-calendar-grid>
      }
    }
  `,
  styles: `
    .schedule-view {
      visibility: hidden;
      display: none;

      &.active {
        visibility: visible;
        position: relative;
        display: block;
      }
    }
  `,
  imports: [
    AdminToolbarComponent,
    CommonModule,
    DataToolbarComponent,
    EventsCalendarGridComponent,
    EventsTableComponent,
    LoadFailedComponent,
    PageHeaderComponent,
    ScheduleToolbarComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SchedulePageComponent implements OnInit {
  protected readonly pageIcon = CalendarDaysIconComponent;

  @ViewChild(ScheduleToolbarComponent)
  private scheduleToolbar!: ScheduleToolbarComponent;

  public readonly addEventLink: InternalLink = {
    text: 'Add an event',
    internalPath: ['event', 'add'],
    icon: PlusCircleIconComponent,
  };

  public readonly exportToCsvButton: AdminButton = {
    id: 'export-to-csv',
    tooltip: 'Export to CSV',
    icon: DownloadIconComponent,
    action: () => this.onExportToCsv(),
  };

  public viewModel$?: Observable<{
    filteredCount: number | null;
    filteredEvents: Event[];
    isAdmin: boolean;
    nextEvent: Event | null;
    options: DataPaginationOptions<Event>;
    scheduleView: 'list' | 'calendar';
    status: LoadStatus;
    totalCount: number;
  }>;

  private readonly storeRequests = inject(StoreRequestService);

  constructor(
    private readonly dialogService: DialogService,
    private readonly metaAndTitleService: MetaAndTitleService,
    private readonly store: Store,
  ) {}

  public ngOnInit(): void {
    this.metaAndTitleService.updateTitle('Schedule');
    this.metaAndTitleService.updateDescription(
      'Scheduled events at the London Chess Club',
    );

    this.viewModel$ = combineLatest([
      this.store.select(EventsSelectors.selectFilteredCount),
      this.store.select(EventsSelectors.selectFilteredEvents),
      this.store.select(AuthSelectors.selectIsAdmin),
      this.store.select(EventsSelectors.selectNextEvent),
      this.store.select(EventsSelectors.selectOptions),
      this.store.select(EventsSelectors.selectScheduleView),
      this.store.select(EventsSelectors.selectTotalCount),
      this.store.select(EventsSelectors.selectFilteredEventsStatus),
    ]).pipe(
      untilDestroyed(this),
      map(
        ([
          filteredCount,
          filteredEvents,
          isAdmin,
          nextEvent,
          options,
          scheduleView,
          totalCount,
          status,
        ]) => ({
          filteredCount,
          filteredEvents,
          isAdmin,
          nextEvent,
          options,
          scheduleView,
          status,
          totalCount,
        }),
      ),
      tap(() => setTimeout(() => this.scheduleToolbar?.changeDetectorRef.markForCheck())),
    );
  }

  public async onExportToCsv(): Promise<void> {
    const eventCount = await firstValueFrom(
      this.store.select(EventsSelectors.selectTotalCount),
    );

    if (!eventCount) {
      return;
    }

    const dialog: Dialog = {
      title: 'Confirm',
      body: `Export all ${eventCount} events to a CSV file?`,
      confirmButtonText: 'Export',
      confirmButtonType: 'primary',
      confirmAction: () =>
        this.storeRequests.dispatch(EventsActions.exportEventsToCsvRequested(), [
          EventsActions.exportEventsToCsvSucceeded,
          EventsActions.exportEventsToCsvFailed,
        ]),
    };

    await this.dialogService.open<BasicDialogComponent, BasicDialogResult>({
      componentType: BasicDialogComponent,
      inputs: { dialog },
      isModal: false,
    });
  }

  public onOptionsChange(options: DataPaginationOptions<Event>, fetch = true): void {
    this.store.dispatch(EventsActions.paginationOptionsChanged({ options, fetch }));
  }

  public onRetry(): void {
    this.store.dispatch(EventsActions.fetchFilteredEventsRequested());
  }

  public onToggleScheduleView(): void {
    this.store.dispatch(EventsActions.toggleScheduleView());
  }
}
