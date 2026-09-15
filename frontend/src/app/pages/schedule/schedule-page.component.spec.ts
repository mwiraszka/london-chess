import { DownloadIconComponent, PlusCircleIconComponent } from '@eagami/ui';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { firstValueFrom, take } from 'rxjs';

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { MOCK_EVENTS } from '@app/mocks/events.mock';
import { DataPaginationOptions, Event } from '@app/models';
import { DialogService, MetaAndTitleService } from '@app/services';
import { AuthSelectors } from '@app/store/auth';
import { EventsActions, EventsSelectors } from '@app/store/events';
import { query } from '@app/utils';

import { SchedulePageComponent } from './schedule-page.component';

describe('SchedulePageComponent', () => {
  let fixture: ComponentFixture<SchedulePageComponent>;
  let component: SchedulePageComponent;

  let dialogService: DialogService;
  let metaAndTitleService: MetaAndTitleService;
  let store: MockStore;

  let dialogOpenSpy: MockInstance;
  let dispatchSpy: MockInstance;
  let onExportToCsvSpy: MockInstance;
  let updateDescriptionSpy: MockInstance;
  let updateTitleSpy: MockInstance;

  const mockFilteredCount = 50;
  const mockFilteredEvents = MOCK_EVENTS.slice(0, 5);
  const mockIsAdmin = true;
  const mockNextEvent = MOCK_EVENTS[2];
  const mockOptions: DataPaginationOptions<Event> = {
    page: 1,
    pageSize: 10,
    sortBy: 'eventDate',
    sortOrder: 'asc',
    filters: {
      showPastEvents: {
        label: 'Show past events',
        value: false,
      },
    },
    search: '',
  };
  const mockScheduleView = 'list';
  const mockTotalCount = 200;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SchedulePageComponent],
      providers: [
        { provide: DialogService, useValue: { open: vi.fn() } },
        {
          provide: MetaAndTitleService,
          useValue: {
            updateTitle: vi.fn(),
            updateDescription: vi.fn(),
          },
        },
        provideMockStore(),
        provideRouter([]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SchedulePageComponent);
    component = fixture.componentInstance;

    dialogService = TestBed.inject(DialogService);
    metaAndTitleService = TestBed.inject(MetaAndTitleService);
    store = TestBed.inject(MockStore);

    dialogOpenSpy = vi.spyOn(dialogService, 'open');
    dispatchSpy = vi.spyOn(store, 'dispatch');
    onExportToCsvSpy = vi.spyOn(component, 'onExportToCsv');
    updateDescriptionSpy = vi.spyOn(metaAndTitleService, 'updateDescription');
    updateTitleSpy = vi.spyOn(metaAndTitleService, 'updateTitle');

    store.overrideSelector(EventsSelectors.selectFilteredCount, mockFilteredCount);
    store.overrideSelector(EventsSelectors.selectFilteredEvents, mockFilteredEvents);
    store.overrideSelector(AuthSelectors.selectIsAdmin, mockIsAdmin);
    store.overrideSelector(EventsSelectors.selectNextEvent, mockNextEvent);
    store.overrideSelector(EventsSelectors.selectOptions, mockOptions);
    store.overrideSelector(EventsSelectors.selectScheduleView, mockScheduleView);
    store.overrideSelector(EventsSelectors.selectTotalCount, mockTotalCount);
    store.overrideSelector(
      EventsSelectors.selectLastFilteredFetch,
      '2026-01-01T00:00:00.000Z',
    );

    store.refreshState();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    beforeEach(() => {
      component.ngOnInit();
    });

    it('should set meta title and description', () => {
      expect(updateTitleSpy).toHaveBeenCalledTimes(1);
      expect(updateTitleSpy).toHaveBeenCalledWith('Schedule');
      expect(updateDescriptionSpy).toHaveBeenCalledTimes(1);
    });

    it('should set viewModel$ with expected data', async () => {
      const vm = await firstValueFrom(component.viewModel$!.pipe(take(1)));

      expect(vm).toStrictEqual({
        filteredCount: mockFilteredCount,
        filteredEvents: mockFilteredEvents,
        isAdmin: mockIsAdmin,
        isLoadingEvents: false,
        nextEvent: mockNextEvent,
        options: mockOptions,
        scheduleView: mockScheduleView,
        totalCount: mockTotalCount,
      });
    });

    it('should call scheduleToolbar?.changeDetectorRef.markForCheck() when viewModel$ emits', () => {
      vi.useFakeTimers();

      // Trigger change detection to ensure ViewChild is initialized
      fixture.detectChanges();

      // Create a spy on the scheduleToolbar's changeDetectorRef.markForCheck method
      const scheduleToolbarMarkForCheckSpy = vi.spyOn(
        // @ts-expect-error Private class member
        component.scheduleToolbar.changeDetectorRef,
        'markForCheck',
      );

      // Drain the setTimeout scheduled by the initial viewModel$ emission, then
      // reset the spy so only emissions triggered below are counted
      vi.advanceTimersByTime(1);
      scheduleToolbarMarkForCheckSpy.mockClear();

      // Change a store value to trigger a new emission from viewModel$
      store.overrideSelector(EventsSelectors.selectFilteredCount, 99);
      store.refreshState();

      // Advance time to execute all setTimeout callbacks
      vi.advanceTimersByTime(1);

      expect(scheduleToolbarMarkForCheckSpy).toHaveBeenCalledTimes(1);

      // Change another store value to ensure multiple emissions are handled as expected
      store.overrideSelector(EventsSelectors.selectScheduleView, 'calendar');
      store.refreshState();

      vi.advanceTimersByTime(1);

      expect(scheduleToolbarMarkForCheckSpy).toHaveBeenCalledTimes(2);
    });

    it('should handle gracefully when scheduleToolbar is undefined', async () => {
      // Don't trigger change detection to keep ViewChild undefined

      // Ensure scheduleToolbar is undefined
      expect(component['scheduleToolbar']).toBeUndefined();

      // This should not throw an error due to optional chaining
      expect(() => {
        // Trigger a viewModel$ emission
        store.overrideSelector(EventsSelectors.selectFilteredCount, 88);
        store.refreshState();
      }).not.toThrow();
    });
  });

  describe('isLoadingEvents', () => {
    it('should be true when events have not been fetched yet', async () => {
      store.overrideSelector(EventsSelectors.selectLastFilteredFetch, null);
      store.refreshState();
      component.ngOnInit();

      const vm = await firstValueFrom(component.viewModel$!.pipe(take(1)));

      expect(vm.isLoadingEvents).toBe(true);
    });

    it('should be false when events have been fetched', async () => {
      component.ngOnInit();

      const vm = await firstValueFrom(component.viewModel$!.pipe(take(1)));

      expect(vm.isLoadingEvents).toBe(false);
    });
  });

  describe('onExportToCsv', () => {
    beforeEach(() => {
      component.ngOnInit();
    });

    it('should return early if event count is zero', async () => {
      store.overrideSelector(EventsSelectors.selectTotalCount, 0);
      store.refreshState();

      await component.onExportToCsv();

      expect(dialogOpenSpy).not.toHaveBeenCalled();
    });

    it('should open confirmation dialog with correct event count', async () => {
      const dialogOpenSpy = vi.spyOn(dialogService, 'open').mockResolvedValue('cancel');

      await component.onExportToCsv();

      expect(dialogOpenSpy).toHaveBeenCalledTimes(1);
      expect(dialogOpenSpy).toHaveBeenCalledWith({
        componentType: expect.any(Function),
        inputs: {
          dialog: {
            title: 'Confirm',
            body: `Export all ${mockTotalCount} events to a CSV file?`,
            confirmButtonText: 'Export',
            confirmButtonType: 'primary',
          },
        },
        isModal: false,
      });
    });

    it('should dispatch exportEventsToCsvRequested when dialog is confirmed', async () => {
      dialogOpenSpy.mockResolvedValue('confirm');

      await component.onExportToCsv();

      expect(dispatchSpy).toHaveBeenCalledWith(
        EventsActions.exportEventsToCsvRequested(),
      );
    });

    it('should not dispatch exportEventsToCsvRequested when dialog is cancelled', async () => {
      dialogOpenSpy.mockResolvedValue('cancel');

      await component.onExportToCsv();

      expect(dispatchSpy).not.toHaveBeenCalled();
    });
  });

  describe('onOptionsChange', () => {
    it('should dispatch paginationOptionsChanged action with fetch true by default', () => {
      const options: DataPaginationOptions<Event> = {
        ...mockOptions,
        page: 1,
      };
      component.onOptionsChange(options);

      expect(dispatchSpy).toHaveBeenCalledTimes(1);
      expect(dispatchSpy).toHaveBeenCalledWith(
        EventsActions.paginationOptionsChanged({ options, fetch: true }),
      );
    });

    it('should dispatch paginationOptionsChanged action with fetch false when specified', () => {
      const options: DataPaginationOptions<Event> = {
        ...mockOptions,
        search: 'test',
      };
      component.onOptionsChange(options, false);

      expect(dispatchSpy).toHaveBeenCalledTimes(1);
      expect(dispatchSpy).toHaveBeenCalledWith(
        EventsActions.paginationOptionsChanged({ options, fetch: false }),
      );
    });
  });

  describe('onRequestDeleteEvent', () => {
    it('should dispatch deleteEventRequested action', () => {
      const event = mockFilteredEvents[0];
      component.onRequestDeleteEvent(event);

      expect(dispatchSpy).toHaveBeenCalledTimes(1);
      expect(dispatchSpy).toHaveBeenCalledWith(
        EventsActions.deleteEventRequested({ event }),
      );
    });
  });

  describe('onToggleScheduleView', () => {
    it('should dispatch toggleScheduleView action', () => {
      component.onToggleScheduleView();

      expect(dispatchSpy).toHaveBeenCalledTimes(1);
      expect(dispatchSpy).toHaveBeenCalledWith(EventsActions.toggleScheduleView());
    });
  });

  describe('component properties', () => {
    it('should have correct addEventLink configuration', () => {
      expect(component.addEventLink).toStrictEqual({
        internalPath: ['event', 'add'],
        text: 'Add an event',
        icon: PlusCircleIconComponent,
      });
    });

    it('should have correct exportToCsvButton configuration', () => {
      expect(component.exportToCsvButton).toEqual({
        id: 'export-to-csv',
        tooltip: 'Export to CSV',
        icon: DownloadIconComponent,
        action: expect.any(Function),
      });
    });

    it('should call onExportToCsv when exportToCsvButton action is called', () => {
      component.exportToCsvButton.action();

      expect(onExportToCsvSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('template rendering', () => {
    describe('when viewModel$ is undefined', () => {
      it('should not render any content', () => {
        expect(query(fixture.debugElement, 'lcc-page-header')).toBeFalsy();
        expect(query(fixture.debugElement, 'lcc-admin-toolbar')).toBeFalsy();
        expect(query(fixture.debugElement, 'lcc-data-toolbar')).toBeFalsy();
        expect(query(fixture.debugElement, 'lcc-schedule-toolbar')).toBeFalsy();
        expect(query(fixture.debugElement, 'lcc-events-table')).toBeFalsy();
        expect(query(fixture.debugElement, 'lcc-events-calendar-grid')).toBeFalsy();
      });
    });

    describe('when viewModel$ is defined', () => {
      it('should render page header, data toolbar, and schedule toolbar', () => {
        fixture.detectChanges();

        expect(query(fixture.debugElement, 'lcc-page-header')).toBeTruthy();
        expect(query(fixture.debugElement, 'lcc-data-toolbar')).toBeTruthy();
        expect(query(fixture.debugElement, 'lcc-schedule-toolbar')).toBeTruthy();
      });

      it('should render admin toolbar for admins', () => {
        store.overrideSelector(AuthSelectors.selectIsAdmin, true);
        fixture.detectChanges();

        expect(query(fixture.debugElement, 'lcc-admin-toolbar')).toBeTruthy();
      });

      it('should not render admin toolbar for non-admins', () => {
        store.overrideSelector(AuthSelectors.selectIsAdmin, false);
        fixture.detectChanges();

        expect(query(fixture.debugElement, 'lcc-admin-toolbar')).toBeFalsy();
      });

      it('should render events table and hide events calendar grid by default', () => {
        fixture.detectChanges();

        expect(query(fixture.debugElement, 'lcc-events-table')).toBeTruthy();
        expect(query(fixture.debugElement, 'lcc-events-calendar-grid')).toBeTruthy();
        expect(
          query(fixture.debugElement, 'lcc-events-table').nativeElement.classList,
        ).toContain('active');
        expect(
          query(fixture.debugElement, 'lcc-events-calendar-grid').nativeElement.classList,
        ).not.toContain('active');
      });

      it('should not render events table or events calendar grid when filteredCount is 0 and not loading', () => {
        store.overrideSelector(EventsSelectors.selectFilteredCount, 0);
        fixture.detectChanges();

        expect(query(fixture.debugElement, 'lcc-events-table')).toBeFalsy();
        expect(query(fixture.debugElement, 'lcc-events-calendar-grid')).toBeFalsy();
      });

      it('should render events table when filteredCount is 0 but isLoadingEvents is true', () => {
        store.overrideSelector(EventsSelectors.selectFilteredCount, 0);
        store.overrideSelector(EventsSelectors.selectLastFilteredFetch, null);
        store.refreshState();
        fixture.detectChanges();

        expect(query(fixture.debugElement, 'lcc-events-table')).toBeTruthy();
      });
    });
  });
});
