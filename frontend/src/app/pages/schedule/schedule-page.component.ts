import {
  CalendarDaysIconComponent,
  DownloadIconComponent,
  EmptyStateComponent,
  FilterXIconComponent,
  InputComponent,
  PaginatorState,
  PlusCircleIconComponent,
  SearchIconComponent,
  SwitchComponent,
} from '@eagami/ui';
import { Store } from '@ngrx/store';
import { Observable, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';

import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  inject,
} from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

import { EventsCalendarGridComponent } from '@app/components/events-calendar-grid/events-calendar-grid.component';
import { EventsTableComponent } from '@app/components/events-table/events-table.component';
import { LoadFailedComponent } from '@app/components/load-failed/load-failed.component';
import { PageHeaderComponent } from '@app/components/page-header/page-header.component';
import { ScheduleToolbarComponent } from '@app/components/schedule-toolbar/schedule-toolbar.component';
import {
  AdminCommandAction,
  AdminLinkAction,
  CalendarPage,
  DataPaginationOptions,
  Event,
  LoadStatus,
} from '@app/models';
import {
  AdminActionsService,
  CsvExportService,
  EventsApiService,
  MetaAndTitleService,
} from '@app/services';
import { AuthSelectors } from '@app/store/auth';
import { EventsActions, EventsSelectors } from '@app/store/events';
import { bindSearchControl, widestRows } from '@app/utils';

@Component({
  selector: 'lcc-schedule-page',
  template: `
    @if (viewModel$ | async; as vm) {
      <lcc-page-header
        heading="Schedule"
        [icon]="pageIcon">
      </lcc-page-header>

      <div class="filters">
        <ea-input
          class="filters__search"
          ariaLabel="Search events"
          placeholder="Search by event type or name"
          [clearable]="true"
          [formControl]="searchControl"
          [icon]="searchIcon" />
        <ea-switch
          class="filters__switch"
          label="Show past events"
          [checked]="vm.options.filters.showPastEvents.value"
          (changed)="onTogglePastEvents($event, vm.options)" />
      </div>

      <lcc-schedule-toolbar
        [filteredEvents]="
          vm.scheduleView === 'calendar' ? vm.calendar.events : vm.filteredEvents
        "
        [scheduleView]="vm.scheduleView"
        [totalCount]="vm.totalCount"
        (toggleScheduleView)="onToggleScheduleView()">
      </lcc-schedule-toolbar>

      @if (vm.status === 'failed') {
        <lcc-load-failed
          title="Unable to load the schedule"
          (retry)="onRetry()" />
      } @else if (
        (vm.filteredCount || vm.status === 'loading' || vm.isFetching) &&
        vm.scheduleView === 'list'
      ) {
        <lcc-events-table
          [events]="vm.filteredEvents"
          [filteredCount]="vm.filteredCount"
          [isAdmin]="vm.isAdmin"
          [isLoading]="vm.status === 'loading' || vm.isFetching"
          [markToday]="true"
          [options]="vm.options"
          [showModificationInfo]="vm.isAdmin"
          [widestEvents]="widestEvents()"
          (optionsChange)="onOptionsChange($event)">
        </lcc-events-table>
      } @else if (vm.filteredCount || vm.status === 'loading' || vm.isFetching) {
        <lcc-events-calendar-grid
          [events]="vm.calendar.events"
          [isAdmin]="vm.isAdmin"
          [isLoading]="vm.status === 'loading' || vm.isFetching"
          [monthCount]="vm.calendar.monthCount"
          [months]="vm.calendar.months"
          [monthsPerPage]="vm.calendar.monthsPerPage"
          [page]="vm.calendar.page"
          [search]="vm.options.search"
          (pageChange)="onCalendarPageChange($event)">
        </lcc-events-calendar-grid>
      } @else {
        <ea-empty-state
          description="No events match these filters."
          [icon]="emptyIcon" />
      }
    }
  `,
  styleUrl: './schedule-page.component.scss',
  imports: [
    CommonModule,
    EmptyStateComponent,
    EventsCalendarGridComponent,
    EventsTableComponent,
    InputComponent,
    LoadFailedComponent,
    PageHeaderComponent,
    ReactiveFormsModule,
    ScheduleToolbarComponent,
    SwitchComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SchedulePageComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  // The widest events size the table from its first skeleton on
  protected readonly widestEvents = widestRows(
    inject(EventsApiService).getWidestEvents(),
  );

  private readonly csvExport = inject(CsvExportService);
  private readonly metaAndTitleService = inject(MetaAndTitleService);
  private readonly store = inject(Store);

  protected readonly pageIcon = CalendarDaysIconComponent;
  protected readonly emptyIcon = FilterXIconComponent;
  protected readonly searchIcon = SearchIconComponent;
  protected readonly searchControl = new FormControl('', { nonNullable: true });

  public readonly addEventAction: AdminLinkAction = {
    label: 'Add event',
    icon: PlusCircleIconComponent,
    group: 'add',
    path: ['event', 'add'],
  };

  public readonly exportEventsAction: AdminCommandAction = {
    label: 'Export events to CSV',
    icon: DownloadIconComponent,
    group: 'data',
    run: () => this.csvExport.exportEvents(),
  };

  public viewModel$?: Observable<{
    calendar: CalendarPage;
    filteredCount: number | null;
    filteredEvents: Event[];
    isAdmin: boolean;
    isFetching: boolean;
    options: DataPaginationOptions<Event>;
    scheduleView: 'list' | 'calendar';
    status: LoadStatus;
    totalCount: number;
  }>;

  constructor() {
    inject(AdminActionsService).register(() => [
      this.addEventAction,
      this.exportEventsAction,
    ]);
  }

  public ngOnInit(): void {
    this.metaAndTitleService.updateTitle('Schedule');
    this.metaAndTitleService.updateDescription(
      'Scheduled events at the London Chess Club',
    );

    bindSearchControl(
      this.searchControl,
      this.store.select(EventsSelectors.selectOptions),
      options => this.onOptionsChange(options),
      this.destroyRef,
    );

    this.viewModel$ = combineLatest([
      this.store.select(EventsSelectors.selectCalendarView),
      this.store.select(EventsSelectors.selectFilteredCount),
      this.store.select(EventsSelectors.selectFilteredEvents),
      this.store.select(AuthSelectors.selectIsAdmin),
      this.store.select(EventsSelectors.selectIsFetchingFiltered),
      this.store.select(EventsSelectors.selectOptions),
      this.store.select(EventsSelectors.selectScheduleView),
      this.store.select(EventsSelectors.selectTotalCount),
      this.store.select(EventsSelectors.selectFilteredEventsStatus),
    ]).pipe(
      map(
        ([
          calendar,
          filteredCount,
          filteredEvents,
          isAdmin,
          isFetching,
          options,
          scheduleView,
          totalCount,
          status,
        ]) => ({
          calendar,
          filteredCount,
          filteredEvents,
          isAdmin,
          isFetching,
          options,
          scheduleView,
          status,
          totalCount,
        }),
      ),
    );
  }

  public onOptionsChange(options: DataPaginationOptions<Event>): void {
    this.store.dispatch(EventsActions.paginationOptionsChanged({ options }));
  }

  public onCalendarPageChange({ page, pageSize }: PaginatorState): void {
    this.store.dispatch(
      EventsActions.calendarPageChanged({ page, monthsPerPage: pageSize }),
    );
  }

  public onTogglePastEvents(
    showPastEvents: boolean,
    options: DataPaginationOptions<Event>,
  ): void {
    this.onOptionsChange({
      ...options,
      page: 1,
      filters: {
        showPastEvents: { ...options.filters.showPastEvents, value: showPastEvents },
      },
    });
  }

  public onRetry(): void {
    this.store.dispatch(EventsActions.fetchFilteredEventsRequested());
  }

  public onToggleScheduleView(): void {
    this.store.dispatch(EventsActions.toggleScheduleView());
  }
}
