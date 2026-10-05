import {
  DialogService,
  DownloadIconComponent,
  PlusCircleIconComponent,
} from '@eagami/ui';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { firstValueFrom, take } from 'rxjs';

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { SEARCH_DEBOUNCE } from '@app/constants/filters';
import { MOCK_EVENTS } from '@app/mocks/events.mock';
import { DataPaginationOptions, Event } from '@app/models';
import {
  CsvExportService,
  MetaAndTitleService,
  StoreRequestService,
} from '@app/services';
import { AuthSelectors } from '@app/store/auth';
import { EventsActions, EventsSelectors } from '@app/store/events';
import { closedDialogRef, query } from '@app/utils';

import { SchedulePageComponent } from './schedule-page.component';

describe('SchedulePageComponent', () => {
  let fixture: ComponentFixture<SchedulePageComponent>;
  let component: SchedulePageComponent;

  let metaAndTitleService: MetaAndTitleService;
  let store: MockStore;

  let dispatchSpy: MockInstance;
  let updateDescriptionSpy: MockInstance;
  let updateTitleSpy: MockInstance;

  const mockFilteredCount = 50;
  const mockFilteredEvents = MOCK_EVENTS.slice(0, 5);
  const mockIsAdmin = true;
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
    // The mock events fall in 2050, so the calendar spans only their months
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2050-01-01T17:00:00.000Z'));

    await TestBed.configureTestingModule({
      imports: [SchedulePageComponent],
      providers: [
        { provide: CsvExportService, useValue: { exportEvents: vi.fn() } },
        { provide: DialogService, useValue: { open: vi.fn(() => closedDialogRef()) } },
        {
          provide: StoreRequestService,
          useValue: { dispatch: vi.fn().mockResolvedValue(null) },
        },
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

    metaAndTitleService = TestBed.inject(MetaAndTitleService);
    store = TestBed.inject(MockStore);

    dispatchSpy = vi.spyOn(store, 'dispatch');
    updateDescriptionSpy = vi.spyOn(metaAndTitleService, 'updateDescription');
    updateTitleSpy = vi.spyOn(metaAndTitleService, 'updateTitle');

    store.overrideSelector(EventsSelectors.selectFilteredCount, mockFilteredCount);
    store.overrideSelector(EventsSelectors.selectFilteredEvents, mockFilteredEvents);
    store.overrideSelector(AuthSelectors.selectIsAdmin, mockIsAdmin);
    store.overrideSelector(EventsSelectors.selectIsFetchingFiltered, false);
    store.overrideSelector(EventsSelectors.selectOptions, mockOptions);
    store.overrideSelector(EventsSelectors.selectScheduleView, mockScheduleView);
    store.overrideSelector(EventsSelectors.selectTotalCount, mockTotalCount);
    store.overrideSelector(EventsSelectors.selectFilteredEventsStatus, 'loaded');

    store.refreshState();
  });

  afterEach(() => {
    store.resetSelectors();
    vi.clearAllTimers();
    vi.useRealTimers();
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
        isFetching: false,
        options: mockOptions,
        scheduleView: mockScheduleView,
        status: 'loaded',
        totalCount: mockTotalCount,
      });
    });
  });

  describe('status', () => {
    it('should pass the filtered events status through', async () => {
      store.overrideSelector(EventsSelectors.selectFilteredEventsStatus, 'loading');
      store.refreshState();
      component.ngOnInit();

      const vm = await firstValueFrom(component.viewModel$!.pipe(take(1)));

      expect(vm.status).toBe('loading');
    });
  });

  describe('onOptionsChange', () => {
    it('should dispatch paginationOptionsChanged with the options', () => {
      const options: DataPaginationOptions<Event> = {
        ...mockOptions,
        page: 1,
      };
      component.onOptionsChange(options);

      expect(dispatchSpy).toHaveBeenCalledTimes(1);
      expect(dispatchSpy).toHaveBeenCalledWith(
        EventsActions.paginationOptionsChanged({ options }),
      );
    });
  });

  describe('onRetry', () => {
    it('should fetch the filtered events again', () => {
      component.onRetry();

      expect(dispatchSpy).toHaveBeenCalledTimes(1);
      expect(dispatchSpy).toHaveBeenCalledWith(
        EventsActions.fetchFilteredEventsRequested(),
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

    it('should export the events from the export button', () => {
      component.exportToCsvButton.action();

      expect(TestBed.inject(CsvExportService).exportEvents).toHaveBeenCalledOnce();
    });
  });

  describe('template rendering', () => {
    describe('when viewModel$ is undefined', () => {
      it('should not render any content', () => {
        expect(query(fixture.debugElement, 'lcc-page-header')).toBeFalsy();
        expect(query(fixture.debugElement, 'lcc-admin-toolbar')).toBeFalsy();
        expect(query(fixture.debugElement, '.filters')).toBeFalsy();
        expect(query(fixture.debugElement, 'lcc-schedule-toolbar')).toBeFalsy();
        expect(query(fixture.debugElement, 'lcc-events-table')).toBeFalsy();
        expect(query(fixture.debugElement, 'lcc-events-calendar-grid')).toBeFalsy();
      });
    });

    describe('when viewModel$ is defined', () => {
      it('should render page header, filters, and schedule toolbar', () => {
        fixture.detectChanges();

        expect(query(fixture.debugElement, 'lcc-page-header')).toBeTruthy();
        expect(query(fixture.debugElement, '.filters')).toBeTruthy();
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
        expect(
          query(fixture.debugElement, 'ea-empty-state').nativeElement.textContent,
        ).toContain('No events match these filters.');
      });

      it('should render both schedule views as skeletons while the events load', () => {
        store.overrideSelector(EventsSelectors.selectFilteredCount, 0);
        store.overrideSelector(EventsSelectors.selectFilteredEventsStatus, 'loading');
        store.refreshState();
        fixture.detectChanges();

        expect(
          query(fixture.debugElement, 'lcc-events-table').componentInstance.isLoading(),
        ).toBe(true);
        expect(
          query(
            fixture.debugElement,
            'lcc-events-calendar-grid',
          ).componentInstance.isLoading(),
        ).toBe(true);
      });

      it('should show both schedule views as loading while another page is fetched', () => {
        store.overrideSelector(EventsSelectors.selectIsFetchingFiltered, true);
        store.refreshState();
        fixture.detectChanges();

        expect(
          query(fixture.debugElement, 'lcc-events-table').componentInstance.isLoading(),
        ).toBe(true);
        expect(
          query(
            fixture.debugElement,
            'lcc-events-calendar-grid',
          ).componentInstance.isLoading(),
        ).toBe(true);
      });

      it('should page both schedule views through the same options', () => {
        fixture.detectChanges();
        const options = { ...mockOptions, page: 2 };

        query(fixture.debugElement, 'lcc-events-calendar-grid').triggerEventHandler(
          'optionsChange',
          options,
        );

        expect(dispatchSpy).toHaveBeenCalledWith(
          EventsActions.paginationOptionsChanged({ options }),
        );
      });

      it('should render a failure panel in place of the schedule views when the events fail to load', () => {
        store.overrideSelector(EventsSelectors.selectFilteredEventsStatus, 'failed');
        store.refreshState();
        fixture.detectChanges();

        expect(query(fixture.debugElement, 'lcc-load-failed')).toBeTruthy();
        expect(query(fixture.debugElement, 'lcc-events-table')).toBeFalsy();
        expect(query(fixture.debugElement, 'lcc-events-calendar-grid')).toBeFalsy();
        expect(query(fixture.debugElement, 'lcc-schedule-toolbar')).toBeTruthy();
      });

      it('should fetch the events again on retry', () => {
        store.overrideSelector(EventsSelectors.selectFilteredEventsStatus, 'failed');
        store.refreshState();
        fixture.detectChanges();

        query(fixture.debugElement, 'lcc-load-failed').triggerEventHandler('retry');

        expect(dispatchSpy).toHaveBeenCalledWith(
          EventsActions.fetchFilteredEventsRequested(),
        );
      });
    });
  });

  describe('the filters', () => {
    it('should search once typing pauses', () => {
      vi.useFakeTimers();
      fixture.detectChanges();

      component['searchControl'].setValue('blitz');
      vi.advanceTimersByTime(SEARCH_DEBOUNCE - 1);
      const dispatchedEarly = dispatchSpy.mock.calls.length;
      vi.advanceTimersByTime(1);
      vi.useRealTimers();

      expect(dispatchedEarly).toBe(0);
      expect(dispatchSpy).toHaveBeenCalledWith(
        EventsActions.paginationOptionsChanged({
          options: { ...mockOptions, search: 'blitz', page: 1 },
        }),
      );
    });

    it('should show the search in force', () => {
      store.overrideSelector(EventsSelectors.selectOptions, {
        ...mockOptions,
        search: 'lecture',
      });
      store.refreshState();
      fixture.detectChanges();

      expect(component['searchControl'].value).toBe('lecture');
    });

    it('should show or hide past events', () => {
      fixture.detectChanges();

      query(fixture.debugElement, '.filters__switch').triggerEventHandler(
        'changed',
        true,
      );

      expect(dispatchSpy).toHaveBeenCalledWith(
        EventsActions.paginationOptionsChanged({
          options: {
            ...mockOptions,
            page: 1,
            filters: {
              showPastEvents: { ...mockOptions.filters.showPastEvents, value: true },
            },
          },
        }),
      );
    });

    it('should clear every filter at once', () => {
      store.overrideSelector(EventsSelectors.selectOptions, {
        ...mockOptions,
        search: 'lecture',
      });
      store.refreshState();
      fixture.detectChanges();

      query(fixture.debugElement, '.filters__clear').triggerEventHandler('clicked');

      expect(dispatchSpy).toHaveBeenCalledWith(
        EventsActions.paginationOptionsChanged({
          options: { ...mockOptions, page: 1, search: '' },
        }),
      );
    });

    it('should offer to clear the filters only while some are in force', () => {
      fixture.detectChanges();

      expect(
        query(fixture.debugElement, '.filters__clear').componentInstance.disabled(),
      ).toBe(true);
    });
  });
});
