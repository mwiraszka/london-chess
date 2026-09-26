import {
  ButtonComponent,
  CalendarDaysIconComponent,
  DownloadIconComponent,
  EmptyStateComponent,
  FilterXIconComponent,
  InputComponent,
  PlusCircleIconComponent,
  SearchIconComponent,
  SwitchComponent,
} from '@eagami/ui';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { Store } from '@ngrx/store';
import { Observable, combineLatest, firstValueFrom } from 'rxjs';
import {
  debounceTime,
  distinctUntilChanged,
  map,
  tap,
  withLatestFrom,
} from 'rxjs/operators';

import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  input,
  viewChild,
} from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

import { AdminToolbarComponent } from '@app/components/admin-toolbar/admin-toolbar.component';
import { BasicDialogComponent } from '@app/components/basic-dialog/basic-dialog.component';
import { EventsCalendarGridComponent } from '@app/components/events-calendar-grid/events-calendar-grid.component';
import { EventsTableComponent } from '@app/components/events-table/events-table.component';
import { LoadFailedComponent } from '@app/components/load-failed/load-failed.component';
import { PageHeaderComponent } from '@app/components/page-header/page-header.component';
import { ScheduleToolbarComponent } from '@app/components/schedule-toolbar/schedule-toolbar.component';
import { SEARCH_DEBOUNCE } from '@app/constants/filters';
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

      <div class="filters">
        <ea-input
          class="filters__search"
          label="Search"
          placeholder="Search by event type or name"
          [formControl]="searchControl"
          [icon]="searchIcon" />
        <ea-switch
          class="filters__switch"
          label="Show past events"
          [checked]="vm.options.filters.showPastEvents.value"
          (changed)="onTogglePastEvents($event, vm.options)" />
        <ea-button
          class="filters__clear"
          variant="ghost"
          size="md"
          [disabled]="!hasFilters(vm.options)"
          (clicked)="onClearFilters(vm.options)">
          Clear filters
        </ea-button>
      </div>

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
      } @else if (vm.filteredCount || vm.status === 'loading' || vm.isFetching) {
        <lcc-events-table
          class="schedule-view"
          [class.active]="vm.scheduleView === 'list'"
          [events]="vm.filteredEvents"
          [filteredCount]="vm.filteredCount"
          [isAdmin]="vm.isAdmin"
          [isLoading]="vm.status === 'loading' || vm.isFetching"
          [options]="vm.options"
          [showModificationInfo]="vm.isAdmin"
          [widestEvents]="widestEvents()"
          (optionsChange)="onOptionsChange($event)">
        </lcc-events-table>

        <lcc-events-calendar-grid
          class="schedule-view"
          [class.active]="vm.scheduleView === 'calendar'"
          [events]="vm.filteredEvents"
          [isAdmin]="vm.isAdmin"
          [isLoading]="vm.status === 'loading' || vm.isFetching"
          [options]="vm.options">
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
    AdminToolbarComponent,
    ButtonComponent,
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
  // The widest events, resolved with the route, size the table before its first page
  public readonly widestEvents = input<Event[]>([]);

  private readonly dialogService = inject(DialogService);
  private readonly metaAndTitleService = inject(MetaAndTitleService);
  private readonly store = inject(Store);

  protected readonly pageIcon = CalendarDaysIconComponent;
  protected readonly emptyIcon = FilterXIconComponent;
  protected readonly searchIcon = SearchIconComponent;
  protected readonly searchControl = new FormControl('', { nonNullable: true });

  private readonly scheduleToolbar = viewChild(ScheduleToolbarComponent);

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
    isFetching: boolean;
    nextEvent: Event | null;
    options: DataPaginationOptions<Event>;
    scheduleView: 'list' | 'calendar';
    status: LoadStatus;
    totalCount: number;
  }>;

  private readonly storeRequests = inject(StoreRequestService);

  public ngOnInit(): void {
    this.metaAndTitleService.updateTitle('Schedule');
    this.metaAndTitleService.updateDescription(
      'Scheduled events at the London Chess Club',
    );

    // The box shows the search in force, wherever it was set, and sends new text on a pause
    this.store
      .select(EventsSelectors.selectOptions)
      .pipe(untilDestroyed(this))
      .subscribe(({ search }) => {
        if (this.searchControl.value !== search) {
          this.searchControl.setValue(search, { emitEvent: false });
        }
      });
    this.searchControl.valueChanges
      .pipe(
        debounceTime(SEARCH_DEBOUNCE),
        distinctUntilChanged(),
        withLatestFrom(this.store.select(EventsSelectors.selectOptions)),
        untilDestroyed(this),
      )
      .subscribe(([search, options]) =>
        this.onOptionsChange({ ...options, search, page: 1 }),
      );

    this.viewModel$ = combineLatest([
      this.store.select(EventsSelectors.selectFilteredCount),
      this.store.select(EventsSelectors.selectFilteredEvents),
      this.store.select(AuthSelectors.selectIsAdmin),
      this.store.select(EventsSelectors.selectIsFetchingFiltered),
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
          isFetching,
          nextEvent,
          options,
          scheduleView,
          totalCount,
          status,
        ]) => ({
          filteredCount,
          filteredEvents,
          isAdmin,
          isFetching,
          nextEvent,
          options,
          scheduleView,
          status,
          totalCount,
        }),
      ),
      tap(() =>
        setTimeout(() => this.scheduleToolbar()?.changeDetectorRef.markForCheck()),
      ),
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

  public onClearFilters(options: DataPaginationOptions<Event>): void {
    this.onOptionsChange({
      ...options,
      page: 1,
      search: '',
      filters: { showPastEvents: { ...options.filters.showPastEvents, value: false } },
    });
  }

  public hasFilters({ search, filters }: DataPaginationOptions<Event>): boolean {
    return search !== '' || filters.showPastEvents.value;
  }

  public onRetry(): void {
    this.store.dispatch(EventsActions.fetchFilteredEventsRequested());
  }

  public onToggleScheduleView(): void {
    this.store.dispatch(EventsActions.toggleScheduleView());
  }
}
