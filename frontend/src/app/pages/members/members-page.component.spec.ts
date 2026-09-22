import {
  DownloadIconComponent,
  PlusCircleIconComponent,
  UploadIconComponent,
} from '@eagami/ui';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { firstValueFrom, take } from 'rxjs';

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { SEARCH_DEBOUNCE } from '@app/constants/filters';
import { MOCK_MEMBERS } from '@app/mocks/members.mock';
import {
  DataPaginationOptions,
  LccError,
  Member,
  MemberWithNewRatings,
} from '@app/models';
import { DialogService, MetaAndTitleService, StoreRequestService } from '@app/services';
import { AppSelectors } from '@app/store/app';
import { AuthSelectors } from '@app/store/auth';
import { MembersActions, MembersSelectors } from '@app/store/members';
import { PARSE_CSV } from '@app/tokens';
import { lastOpenedDialog, query } from '@app/utils';

import { MembersPageComponent } from './members-page.component';

describe('MembersPageComponent', () => {
  let fixture: ComponentFixture<MembersPageComponent>;
  let component: MembersPageComponent;

  let dialogOpenSpy: MockInstance;
  let dialogService: DialogService;
  let metaAndTitleService: MetaAndTitleService;
  let store: MockStore;

  let dispatchSpy: MockInstance;
  let onExportToCsvSpy: MockInstance;
  let storeRequestSpy: Mock;
  let updateDescriptionSpy: MockInstance;
  let updateTitleSpy: MockInstance;

  const mockFilteredCount = 50;
  const mockFilteredMembers = MOCK_MEMBERS.slice(0, 3);
  const mockIsAdmin = true;
  const mockIsSafeMode = false;
  const mockOptions: DataPaginationOptions<Member> = {
    page: 0,
    pageSize: 10,
    sortBy: 'firstName',
    sortOrder: 'asc',
    filters: {
      showInactiveMembers: {
        label: 'Show Inactive Members',
        value: true,
      },
    },
    search: '',
  };
  const mockTotalCount = 100;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MembersPageComponent],
      providers: [
        { provide: PARSE_CSV, useValue: vi.fn() },
        {
          provide: DialogService,
          useValue: { open: vi.fn() },
        },
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

    fixture = TestBed.createComponent(MembersPageComponent);
    component = fixture.componentInstance;

    dialogService = TestBed.inject(DialogService);
    metaAndTitleService = TestBed.inject(MetaAndTitleService);
    store = TestBed.inject(MockStore);

    dialogOpenSpy = vi.spyOn(dialogService, 'open');
    dispatchSpy = vi.spyOn(store, 'dispatch');
    onExportToCsvSpy = vi.spyOn(component, 'onExportToCsv');
    storeRequestSpy = vi.mocked(TestBed.inject(StoreRequestService).dispatch);
    updateDescriptionSpy = vi.spyOn(metaAndTitleService, 'updateDescription');
    updateTitleSpy = vi.spyOn(metaAndTitleService, 'updateTitle');

    store.overrideSelector(MembersSelectors.selectFilteredCount, mockFilteredCount);
    store.overrideSelector(MembersSelectors.selectFilteredMembers, mockFilteredMembers);
    store.overrideSelector(AuthSelectors.selectIsAdmin, mockIsAdmin);
    store.overrideSelector(AppSelectors.selectIsSafeMode, mockIsSafeMode);
    store.overrideSelector(MembersSelectors.selectOptions, mockOptions);
    store.overrideSelector(MembersSelectors.selectTotalCount, mockTotalCount);
    store.overrideSelector(MembersSelectors.selectFilteredMembersStatus, 'loaded');
    store.overrideSelector(MembersSelectors.selectRecordsScope, 'admin');
    store.refreshState();
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
      expect(updateTitleSpy).toHaveBeenCalledWith('Members');
      expect(updateDescriptionSpy).toHaveBeenCalledTimes(1);
    });

    it('should set viewModel$ with expected data', async () => {
      const vm = await firstValueFrom(component.viewModel$!.pipe(take(1)));

      expect(vm).toStrictEqual({
        filteredCount: mockFilteredCount,
        filteredMembers: mockFilteredMembers,
        isAdmin: mockIsAdmin,
        isSafeMode: mockIsSafeMode,
        options: mockOptions,
        status: 'loaded',
        totalCount: mockTotalCount,
      });
    });
  });

  describe('onOptionsChange', () => {
    it('should dispatch paginationOptionsChanged action with fetch true by default', () => {
      const options: DataPaginationOptions<Member> = {
        ...mockOptions,
        page: 1,
      };
      component.onOptionsChange(options);

      expect(dispatchSpy).toHaveBeenCalledTimes(1);
      expect(dispatchSpy).toHaveBeenCalledWith(
        MembersActions.paginationOptionsChanged({ options, fetch: true }),
      );
    });

    it('should dispatch paginationOptionsChanged action with fetch false when specified', () => {
      const options: DataPaginationOptions<Member> = {
        ...mockOptions,
        search: 'test',
      };
      component.onOptionsChange(options, false);

      expect(dispatchSpy).toHaveBeenCalledTimes(1);
      expect(dispatchSpy).toHaveBeenCalledWith(
        MembersActions.paginationOptionsChanged({ options, fetch: false }),
      );
    });
  });

  describe('onRetry', () => {
    it('should fetch the filtered members again', () => {
      component.onRetry();

      expect(dispatchSpy).toHaveBeenCalledTimes(1);
      expect(dispatchSpy).toHaveBeenCalledWith(
        MembersActions.fetchFilteredMembersRequested(),
      );
    });
  });

  describe('onMemberRatingChangesFileSelected', () => {
    let parseCsvSpy: MockInstance;
    let mockEvent: Event;
    let mockFile: File;

    beforeEach(() => {
      mockFile = new File(['test,data'], 'test.csv', { type: 'text/csv' });
      mockEvent = {
        target: {
          files: [mockFile],
          value: 'test.csv',
        },
      } as unknown as Event;

      parseCsvSpy = TestBed.inject(PARSE_CSV) as Mock;
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should return early if no file is selected', async () => {
      const eventWithoutFile = {
        target: {
          files: null,
          value: '',
        },
      } as unknown as Event;

      await component.onMemberRatingChangesFileSelected(eventWithoutFile);

      expect(parseCsvSpy).not.toHaveBeenCalled();
      expect(dispatchSpy).not.toHaveBeenCalled();
    });

    it('should clear input value after processing', async () => {
      parseCsvSpy.mockResolvedValue([['John', 'Doe', '1500', '1520', '1550']]);
      store.overrideSelector(MembersSelectors.selectAllMembers, MOCK_MEMBERS);
      store.overrideSelector(MembersSelectors.selectTotalCount, MOCK_MEMBERS.length);
      store.refreshState();

      vi.spyOn(dialogService, 'open').mockResolvedValue('cancel');

      await component.onMemberRatingChangesFileSelected(mockEvent);

      expect((mockEvent.target as HTMLInputElement).value).toBe('');
    });

    it('should dispatch parseMemberRatingsFromCsvFailed when CSV parsing fails', async () => {
      const mockError: LccError = {
        name: 'LCCError',
        message: 'Invalid CSV format',
      };
      parseCsvSpy.mockResolvedValue(mockError);

      await component.onMemberRatingChangesFileSelected(mockEvent);

      expect(dispatchSpy).toHaveBeenCalledTimes(1);
      expect(dispatchSpy).toHaveBeenCalledWith(
        MembersActions.parseMemberRatingsFromCsvFailed({ error: mockError }),
      );
    });

    it('should open rating changes dialog when CSV parsing succeeds', async () => {
      dialogOpenSpy.mockResolvedValue('confirm');
      parseCsvSpy.mockResolvedValue([
        ['Magnus', 'Carlsen', '2850', '2860', '2882'],
        ['Hikaru', 'Nakamura', '2775', '2785', '2816'],
      ]);
      store.overrideSelector(MembersSelectors.selectAllMembers, MOCK_MEMBERS);
      store.overrideSelector(MembersSelectors.selectTotalCount, MOCK_MEMBERS.length);
      store.refreshState();

      await component.onMemberRatingChangesFileSelected(mockEvent);

      expect(dialogOpenSpy).toHaveBeenCalledTimes(1);
      expect(dialogOpenSpy).toHaveBeenCalledWith({
        componentType: expect.any(Function),
        inputs: {
          confirmAction: expect.any(Function),
          membersWithNewRatings: expect.any(Array),
          unmatchedMembers: expect.any(Array),
        },
        isModal: false,
      });
    });

    it('should update the ratings from the confirmation dialog', async () => {
      parseCsvSpy.mockResolvedValue([['Magnus', 'Carlsen', '2850', '2860', '2882']]);
      store.overrideSelector(MembersSelectors.selectAllMembers, MOCK_MEMBERS);
      store.overrideSelector(MembersSelectors.selectTotalCount, MOCK_MEMBERS.length);
      store.refreshState();

      await component.onMemberRatingChangesFileSelected(mockEvent);
      const confirmAction = dialogOpenSpy.mock.lastCall?.[0].inputs?.[
        'confirmAction'
      ] as () => Promise<unknown>;
      await confirmAction();

      expect(storeRequestSpy).toHaveBeenCalledWith(
        MembersActions.updateMemberRatingsRequested({
          membersWithNewRatings: [
            { ...MOCK_MEMBERS[0], newRating: '2860', newPeakRating: '2882' },
          ],
        }),
        [
          MembersActions.updateMemberRatingsSucceeded,
          MembersActions.updateMemberRatingsFailed,
        ],
      );
    });

    it('should not update any ratings until the dialog is confirmed', async () => {
      dialogOpenSpy.mockResolvedValue('cancel');
      parseCsvSpy.mockResolvedValue([['Magnus', 'Carlsen', '2850', '2860', '2882']]);
      store.overrideSelector(MembersSelectors.selectAllMembers, MOCK_MEMBERS);
      store.overrideSelector(MembersSelectors.selectTotalCount, MOCK_MEMBERS.length);
      store.refreshState();

      await component.onMemberRatingChangesFileSelected(mockEvent);

      expect(storeRequestSpy).not.toHaveBeenCalled();
    });

    it('should show the upload button as loading while the ratings are prepared', async () => {
      let resolveParsing: (rows: string[][]) => void = () => undefined;
      parseCsvSpy.mockReturnValue(new Promise(resolve => (resolveParsing = resolve)));
      store.overrideSelector(MembersSelectors.selectAllMembers, MOCK_MEMBERS);
      store.overrideSelector(MembersSelectors.selectTotalCount, MOCK_MEMBERS.length);
      store.refreshState();

      const selection = component.onMemberRatingChangesFileSelected(mockEvent);

      expect(component.updateRatingsFromCsvButton.isLoading?.()).toBe(true);
      expect(dialogOpenSpy).not.toHaveBeenCalled();

      resolveParsing([['Magnus', 'Carlsen', '2850', '2860', '2882']]);
      await selection;

      expect(component.updateRatingsFromCsvButton.isLoading?.()).toBe(false);
      expect(dialogOpenSpy).toHaveBeenCalledTimes(1);
    });

    it('should stop loading when the file cannot be parsed', async () => {
      parseCsvSpy.mockResolvedValue({ name: 'LCCError', message: 'Invalid CSV format' });

      await component.onMemberRatingChangesFileSelected(mockEvent);

      expect(component.updateRatingsFromCsvButton.isLoading?.()).toBe(false);
    });

    describe('when only public member records are loaded', () => {
      beforeEach(() => {
        parseCsvSpy.mockResolvedValue([['Magnus', 'Carlsen', '2850', '2860', '2882']]);
        store.overrideSelector(MembersSelectors.selectAllMembers, MOCK_MEMBERS);
        store.overrideSelector(MembersSelectors.selectTotalCount, MOCK_MEMBERS.length);
        store.overrideSelector(MembersSelectors.selectRecordsScope, 'public');
        store.refreshState();
      });

      it('should fetch the full records before matching the ratings', async () => {
        storeRequestSpy.mockResolvedValue(
          MembersActions.fetchAllMembersSucceeded({
            members: MOCK_MEMBERS,
            totalCount: MOCK_MEMBERS.length,
            scope: 'admin',
          }),
        );

        await component.onMemberRatingChangesFileSelected(mockEvent);

        expect(storeRequestSpy).toHaveBeenCalledWith(
          MembersActions.fetchAllMembersRequested(),
          [MembersActions.fetchAllMembersSucceeded, MembersActions.fetchAllMembersFailed],
        );
        expect(dialogOpenSpy).toHaveBeenCalledTimes(1);
      });

      it('should not open the dialog when the full records fail to load', async () => {
        storeRequestSpy.mockResolvedValue(
          MembersActions.fetchAllMembersFailed({
            error: { name: 'LCCError', message: 'Unable to load members.' },
          }),
        );

        await component.onMemberRatingChangesFileSelected(mockEvent);

        expect(dialogOpenSpy).not.toHaveBeenCalled();
        expect(component.updateRatingsFromCsvButton.isLoading?.()).toBe(false);
      });
    });

    it('should handle members with new ratings correctly', async () => {
      dialogOpenSpy.mockResolvedValue('confirm');
      parseCsvSpy.mockResolvedValue([['Magnus', 'Carlsen', '2850', '2860', '2882']]);
      store.overrideSelector(MembersSelectors.selectAllMembers, MOCK_MEMBERS);
      store.overrideSelector(MembersSelectors.selectTotalCount, MOCK_MEMBERS.length);
      store.refreshState();

      await component.onMemberRatingChangesFileSelected(mockEvent);

      const dialogCall = dialogOpenSpy.mock.calls[0][0];
      const membersWithNewRatings = dialogCall.inputs?.[
        'membersWithNewRatings'
      ] as MemberWithNewRatings[];

      expect(membersWithNewRatings).toHaveLength(1);
      expect(membersWithNewRatings[0]).toMatchObject({
        firstName: 'Magnus',
        lastName: 'Carlsen',
        rating: '2850',
        newRating: '2860',
        newPeakRating: '2882',
      });
    });

    it('should handle unmatched members correctly', async () => {
      dialogOpenSpy.mockResolvedValue('cancel');
      parseCsvSpy.mockResolvedValue([['Unknown', 'Player', '1500', '1520', '1550']]);
      store.overrideSelector(MembersSelectors.selectAllMembers, MOCK_MEMBERS);
      store.overrideSelector(MembersSelectors.selectTotalCount, MOCK_MEMBERS.length);
      store.refreshState();

      await component.onMemberRatingChangesFileSelected(mockEvent);

      const dialogCall = dialogOpenSpy.mock.calls[0][0];
      const unmatchedMembers = dialogCall.inputs?.['unmatchedMembers'] as string[];

      expect(unmatchedMembers).toHaveLength(1);
      expect(unmatchedMembers[0]).toBe('Unknown Player');
    });
  });

  describe('onExportToCsv', () => {
    beforeEach(() => {
      component.ngOnInit();
    });

    it('should return early if viewModel$ is undefined', async () => {
      component.viewModel$ = undefined;

      await component.onExportToCsv();

      expect(dialogOpenSpy).not.toHaveBeenCalled();
    });

    it('should return early if member count is zero', async () => {
      store.overrideSelector(MembersSelectors.selectTotalCount, 0);
      store.refreshState();

      await component.onExportToCsv();

      expect(dialogOpenSpy).not.toHaveBeenCalled();
    });

    it('should open confirmation dialog with correct member count', async () => {
      const dialogOpenSpy = vi.spyOn(dialogService, 'open').mockResolvedValue('cancel');

      await component.onExportToCsv();

      expect(dialogOpenSpy).toHaveBeenCalledTimes(1);
      expect(dialogOpenSpy).toHaveBeenCalledWith({
        componentType: expect.any(Function),
        inputs: {
          dialog: expect.objectContaining({
            title: 'Confirm',
            body: `Export all ${mockTotalCount} members to a CSV file?`,
            confirmButtonText: 'Export',
            confirmButtonType: 'primary',
          }),
        },
        isModal: false,
      });
    });

    it('should export the members from the confirmation dialog', async () => {
      await component.onExportToCsv();
      await lastOpenedDialog(dialogOpenSpy).confirmAction?.();

      expect(storeRequestSpy).toHaveBeenCalledWith(
        MembersActions.exportMembersToCsvRequested(),
        [
          MembersActions.exportMembersToCsvSucceeded,
          MembersActions.exportMembersToCsvFailed,
        ],
      );
    });

    it('should not export anything until the dialog is confirmed', async () => {
      dialogOpenSpy.mockResolvedValue('cancel');

      await component.onExportToCsv();

      expect(storeRequestSpy).not.toHaveBeenCalled();
    });
  });

  describe('component properties', () => {
    it('should have correct addMemberLink configuration', () => {
      expect(component.addMemberLink).toStrictEqual({
        internalPath: ['member', 'add'],
        text: 'Add a member',
        icon: PlusCircleIconComponent,
      });
    });

    it('should have correct admin button configurations', () => {
      expect(component.updateRatingsFromCsvButton).toEqual({
        id: 'update-ratings-from-csv',
        tooltip: 'Update member ratings from CSV',
        icon: UploadIconComponent,
        action: expect.any(Function),
        isLoading: expect.any(Function),
      });

      expect(component.exportToCsvButton).toEqual({
        id: 'export-to-csv',
        tooltip: 'Export to CSV',
        icon: DownloadIconComponent,
        action: expect.any(Function),
      });
    });

    it('should trigger file input click when updateRatingsFromCsvButton action is called', () => {
      const mockClick = vi.fn();
      component.memberRatingChangesFileInput = {
        nativeElement: { click: mockClick } as unknown as HTMLInputElement,
      };

      component.updateRatingsFromCsvButton.action();

      expect(mockClick).toHaveBeenCalledTimes(1);
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
        expect(query(fixture.debugElement, 'input[type="file"]')).toBeFalsy();
        expect(query(fixture.debugElement, 'lcc-admin-toolbar')).toBeFalsy();
        expect(query(fixture.debugElement, '.filters')).toBeFalsy();
        expect(query(fixture.debugElement, 'lcc-members-table')).toBeFalsy();
      });
    });

    describe('when viewModel$ is defined', () => {
      it('should render the page header, the filters and the members table', () => {
        fixture.detectChanges();

        expect(query(fixture.debugElement, 'lcc-page-header')).toBeTruthy();
        expect(query(fixture.debugElement, '.filters')).toBeTruthy();
        expect(query(fixture.debugElement, 'lcc-members-table')).toBeTruthy();
      });

      it('should render file input and admin toolbar for admins', () => {
        store.overrideSelector(AuthSelectors.selectIsAdmin, true);
        fixture.detectChanges();

        expect(query(fixture.debugElement, 'input[type="file"]')).toBeTruthy();
        expect(query(fixture.debugElement, 'lcc-admin-toolbar')).toBeTruthy();
      });

      it('should not render file input or admin toolbar for non-admins', () => {
        store.overrideSelector(AuthSelectors.selectIsAdmin, false);
        fixture.detectChanges();

        expect(query(fixture.debugElement, 'input[type="file"]')).toBeFalsy();
        expect(query(fixture.debugElement, 'lcc-admin-toolbar')).toBeFalsy();
      });
    });

    describe('while the members load', () => {
      it('should render the members table as a skeleton', () => {
        store.overrideSelector(MembersSelectors.selectFilteredMembersStatus, 'loading');
        store.refreshState();
        fixture.detectChanges();

        expect(
          query(fixture.debugElement, 'lcc-members-table').componentInstance.isLoading(),
        ).toBe(true);
      });
    });

    describe('when the members fail to load', () => {
      beforeEach(() => {
        store.overrideSelector(MembersSelectors.selectFilteredMembersStatus, 'failed');
        store.refreshState();
        fixture.detectChanges();
      });

      it('should render a failure panel in place of the members table', () => {
        expect(query(fixture.debugElement, 'lcc-load-failed')).toBeTruthy();
        expect(query(fixture.debugElement, 'lcc-members-table')).toBeFalsy();
        expect(query(fixture.debugElement, '.filters')).toBeTruthy();
      });

      it('should fetch the members again on retry', () => {
        query(fixture.debugElement, 'lcc-load-failed').triggerEventHandler('retry');

        expect(dispatchSpy).toHaveBeenCalledWith(
          MembersActions.fetchFilteredMembersRequested(),
        );
      });
    });
  });

  describe('the filters', () => {
    it('should search once typing pauses', () => {
      vi.useFakeTimers();
      fixture.detectChanges();

      component['searchControl'].setValue('car');
      vi.advanceTimersByTime(SEARCH_DEBOUNCE - 1);
      const dispatchedEarly = dispatchSpy.mock.calls.length;
      vi.advanceTimersByTime(1);
      vi.useRealTimers();

      expect(dispatchedEarly).toBe(0);
      expect(dispatchSpy).toHaveBeenCalledWith(
        MembersActions.paginationOptionsChanged({
          options: { ...mockOptions, search: 'car', page: 1 },
          fetch: true,
        }),
      );
    });

    it('should show the search in force', () => {
      store.overrideSelector(MembersSelectors.selectOptions, {
        ...mockOptions,
        search: 'polgar',
      });
      store.refreshState();
      fixture.detectChanges();

      expect(component['searchControl'].value).toBe('polgar');
    });

    it('should show or hide inactive members', () => {
      fixture.detectChanges();

      query(fixture.debugElement, '.filters__switch').triggerEventHandler(
        'changed',
        false,
      );

      expect(dispatchSpy).toHaveBeenCalledWith(
        MembersActions.paginationOptionsChanged({
          options: {
            ...mockOptions,
            page: 1,
            filters: {
              showInactiveMembers: {
                ...mockOptions.filters.showInactiveMembers,
                value: false,
              },
            },
          },
          fetch: true,
        }),
      );
    });

    it('should clear every filter at once', () => {
      store.overrideSelector(MembersSelectors.selectOptions, {
        ...mockOptions,
        search: 'polgar',
      });
      store.refreshState();
      fixture.detectChanges();

      query(fixture.debugElement, '.filters__clear').triggerEventHandler('clicked');

      expect(dispatchSpy).toHaveBeenCalledWith(
        MembersActions.paginationOptionsChanged({
          options: {
            ...mockOptions,
            page: 1,
            search: '',
            filters: {
              showInactiveMembers: {
                ...mockOptions.filters.showInactiveMembers,
                value: false,
              },
            },
          },
          fetch: true,
        }),
      );
    });

    it('should have nothing to clear without a search or inactive members shown', () => {
      store.overrideSelector(MembersSelectors.selectOptions, {
        ...mockOptions,
        filters: {
          showInactiveMembers: {
            ...mockOptions.filters.showInactiveMembers,
            value: false,
          },
        },
      });
      store.refreshState();
      fixture.detectChanges();

      expect(
        query(fixture.debugElement, '.filters__clear').componentInstance.disabled(),
      ).toBe(true);
    });
  });
});
