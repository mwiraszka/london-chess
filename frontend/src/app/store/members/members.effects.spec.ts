import { provideMockActions } from '@ngrx/effects/testing';
import { Action } from '@ngrx/store';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { ReplaySubject, firstValueFrom, of, throwError } from 'rxjs';

import { TestBed } from '@angular/core/testing';

import { initialMemberFormData } from '@app/constants';
import { MOCK_MEMBERS } from '@app/mocks/members.mock';
import {
  ApiResponse,
  ApiScope,
  LccError,
  Member,
  MemberRatingsUpdate,
  PaginatedItems,
  User,
} from '@app/models';
import { MemberProfilesService, MembersApiService } from '@app/services';
import * as AppActions from '@app/store/app/app.actions';
import { AuthSelectors } from '@app/store/auth';
import { NavSelectors } from '@app/store/nav';
import {
  EXPORT_DATA_TO_CSV,
  GET_NEW_PEAK_RATING,
  IS_EXPIRED,
  PARSE_ERROR,
} from '@app/tokens';
import moment from '@app/utils/datetime/moment';

import { MembersActions, MembersSelectors } from '.';
import { MembersEffects } from './members.effects';

const mockExportDataToCsv = vi.fn();
const mockParseError = vi.fn();
const mockIsExpired = vi.fn();
const mockGetNewPeakRating = vi.fn();

describe('MembersEffects', () => {
  let actions$: ReplaySubject<Action>;
  let effects: MembersEffects;
  let membersApiService: Mocked<MembersApiService>;
  let store: MockStore;

  const mockUser: User = {
    id: 'user123',
    firstName: 'Test',
    lastName: 'User',
    email: 'test@example.com',
    isAdmin: true,
    memberNumber: null,
  };

  const mockError: LccError = {
    name: 'LCCError',
    message: 'Test error',
  };

  const mockApiResponse: ApiResponse<PaginatedItems<Member>> = {
    data: {
      items: [MOCK_MEMBERS[0], MOCK_MEMBERS[1]],
      filteredCount: 2,
      totalCount: 5,
    },
  };

  beforeEach(() => {
    const membersApiServiceMock = {
      getAllMembers: vi.fn(),
      getFilteredMembers: vi.fn(),
      getMember: vi.fn(),
      getMemberByNumber: vi.fn(),
      addMember: vi.fn(),
      updateMember: vi.fn(),
      updateMembers: vi.fn(),
      deleteMember: vi.fn(),
    };

    const mockMembersState = {
      ids: MOCK_MEMBERS.map(m => m.id),
      entities: MOCK_MEMBERS.reduce(
        (acc, member) => ({
          ...acc,
          [member.id]: { member, formData: null },
        }),
        {},
      ),
      failedLoads: [],
      isFetchingFiltered: false,
      newMemberFormData: initialMemberFormData(),
      recordsScope: 'admin' as const,
      lastFullFetch: null,
      lastFilteredFetch: null,
      filteredMembers: [],
      options: {
        page: 1,
        pageSize: 10,
        sortBy: 'lastName',
        sortOrder: 'asc',
        filters: {
          showInactiveMembers: {
            label: 'Show inactive members',
            value: false,
          },
        },
        search: '',
      },
      filteredCount: null,
      totalCount: 0,
    };

    TestBed.configureTestingModule({
      providers: [
        MembersEffects,
        { provide: PARSE_ERROR, useValue: mockParseError },
        { provide: IS_EXPIRED, useValue: mockIsExpired },
        { provide: EXPORT_DATA_TO_CSV, useValue: mockExportDataToCsv },
        { provide: GET_NEW_PEAK_RATING, useValue: mockGetNewPeakRating },
        { provide: MemberProfilesService, useValue: { reload: vi.fn() } },
        provideMockActions(() => actions$),
        { provide: MembersApiService, useValue: membersApiServiceMock },
        provideMockStore({
          initialState: {
            membersState: mockMembersState,
            navState: { pathHistory: [] },
          },
        }),
      ],
    });

    effects = TestBed.inject(MembersEffects);
    membersApiService = TestBed.inject(MembersApiService) as Mocked<MembersApiService>;
    store = TestBed.inject(MockStore);
    actions$ = new ReplaySubject<Action>(1);

    vi.clearAllMocks();
    mockParseError.mockImplementation(error => error);
    mockGetNewPeakRating.mockImplementation((rating, peakRating) => peakRating);
  });

  afterEach(() => store.resetSelectors());

  describe('reloadMemberProfiles$', () => {
    it.each([
      [
        'a member is added',
        MembersActions.addMemberSucceeded({ member: MOCK_MEMBERS[0], emailSent: null }),
      ],
      [
        'a member is updated',
        MembersActions.updateMemberSucceeded({
          member: MOCK_MEMBERS[0],
          originalMemberName: 'John Doe',
          emailSent: null,
        }),
      ],
      ['the app is refreshed', AppActions.refreshAppRequested()],
    ])('should load the member profiles again once %s', (_, action) => {
      const reload = vi.mocked(TestBed.inject(MemberProfilesService).reload);
      effects.reloadMemberProfiles$.subscribe();

      actions$.next(action);

      expect(reload).toHaveBeenCalledTimes(1);
    });
  });

  describe('replaceRecordsOnScopeChange$', () => {
    const emittedFor = (scope: ApiScope, recordsScope: ApiScope | null): Action[] => {
      store.overrideSelector(AuthSelectors.selectApiScope, scope);
      store.overrideSelector(MembersSelectors.selectRecordsScope, recordsScope);
      store.refreshState();
      const emitted: Action[] = [];

      effects.replaceRecordsOnScopeChange$.subscribe(action => emitted.push(action));

      return emitted;
    };

    it('should fetch every member for an admin while the stored records are public', () => {
      expect(emittedFor('admin', 'public')).toEqual([
        MembersActions.fetchAllMembersRequested(),
      ]);
    });

    it('should fetch the public records once an admin switches their controls off', () => {
      expect(emittedFor('public', 'admin')).toEqual([
        MembersActions.fetchAllMembersRequested(),
      ]);
    });

    it('should not fetch when the stored records already match', () => {
      expect(emittedFor('admin', 'admin')).toEqual([]);
      expect(emittedFor('public', 'public')).toEqual([]);
    });

    it('should not fetch before any records are stored', () => {
      expect(emittedFor('admin', null)).toEqual([]);
    });
  });

  describe('fetchAllMembers$', () => {
    beforeEach(() => {
      store.overrideSelector(AuthSelectors.selectApiScope, 'admin');
      store.refreshState();
    });

    it('should fetch all members successfully', async () => {
      membersApiService.getAllMembers.mockReturnValue(of(mockApiResponse));

      actions$.next(MembersActions.fetchAllMembersRequested());
      const action = await firstValueFrom(effects.fetchAllMembers$);

      expect(action).toEqual(
        MembersActions.fetchAllMembersSucceeded({
          members: mockApiResponse.data.items,
          totalCount: mockApiResponse.data.totalCount,
          scope: 'admin',
        }),
      );
      expect(membersApiService.getAllMembers).toHaveBeenCalledWith('admin');
    });

    it('should handle fetch all members failure', async () => {
      membersApiService.getAllMembers.mockReturnValue(throwError(() => mockError));
      mockParseError.mockReturnValue(mockError);

      actions$.next(MembersActions.fetchAllMembersRequested());
      const action = await firstValueFrom(effects.fetchAllMembers$);

      expect(action).toEqual(MembersActions.fetchAllMembersFailed({ error: mockError }));
      expect(mockParseError).toHaveBeenCalledWith(mockError);
    });
  });

  describe('fetchFilteredMembers$', () => {
    const mockOptions = {
      page: 2,
      pageSize: 10,
      sortBy: 'firstName' as const,
      sortOrder: 'desc' as const,
      filters: {
        showInactiveMembers: {
          label: 'Show inactive members',
          value: false,
        },
      },
      search: 'chess',
    };

    beforeEach(() => {
      store.overrideSelector(AuthSelectors.selectApiScope, 'admin');
      store.overrideSelector(MembersSelectors.selectOptions, mockOptions);
      store.refreshState();
    });

    it('should fetch filtered members with options from store', async () => {
      membersApiService.getFilteredMembers.mockReturnValue(of(mockApiResponse));

      actions$.next(MembersActions.fetchFilteredMembersRequested());
      const action = await firstValueFrom(effects.fetchFilteredMembers$);

      expect(action).toEqual(
        MembersActions.fetchFilteredMembersSucceeded({
          members: mockApiResponse.data.items,
          filteredCount: mockApiResponse.data.filteredCount,
          totalCount: mockApiResponse.data.totalCount,
          scope: 'admin',
        }),
      );
      expect(membersApiService.getFilteredMembers).toHaveBeenCalledWith(
        'admin',
        mockOptions,
      );
    });

    it('should handle fetch filtered members failure', async () => {
      membersApiService.getFilteredMembers.mockReturnValue(throwError(() => mockError));
      mockParseError.mockReturnValue(mockError);

      actions$.next(MembersActions.fetchFilteredMembersRequested());
      const action = await firstValueFrom(effects.fetchFilteredMembers$);

      expect(action).toEqual(
        MembersActions.fetchFilteredMembersFailed({ error: mockError }),
      );
    });
  });

  describe('refetchFilteredMembers$', () => {
    it('should trigger refetch after addMemberSucceeded', async () => {
      actions$.next(
        MembersActions.addMemberSucceeded({ member: MOCK_MEMBERS[0], emailSent: null }),
      );
      const action = await firstValueFrom(effects.refetchFilteredMembers$);

      expect(action).toEqual(MembersActions.fetchFilteredMembersRequested());
    });

    it('should trigger refetch after updateMemberSucceeded', async () => {
      actions$.next(
        MembersActions.updateMemberSucceeded({
          member: MOCK_MEMBERS[0],
          originalMemberName: 'Old Name',
          emailSent: null,
        }),
      );
      const action = await firstValueFrom(effects.refetchFilteredMembers$);

      expect(action).toEqual(MembersActions.fetchFilteredMembersRequested());
    });

    it('should trigger refetch after updateMemberRatingsSucceeded', async () => {
      actions$.next(
        MembersActions.updateMemberRatingsSucceeded({
          members: [MOCK_MEMBERS[0]],
          unnotifiedMemberNames: [],
        }),
      );
      const action = await firstValueFrom(effects.refetchFilteredMembers$);

      expect(action).toEqual(MembersActions.fetchFilteredMembersRequested());
    });

    it('should trigger refetch after deleteMemberSucceeded', async () => {
      actions$.next(
        MembersActions.deleteMemberSucceeded({
          memberId: MOCK_MEMBERS[0].id,
          memberName: 'Test Member',
        }),
      );
      const action = await firstValueFrom(effects.refetchFilteredMembers$);

      expect(action).toEqual(MembersActions.fetchFilteredMembersRequested());
    });

    it('should trigger refetch after paginationOptionsChanged', async () => {
      actions$.next(
        MembersActions.paginationOptionsChanged({
          options: {
            page: 1,
            pageSize: 10,
            sortBy: 'lastName',
            sortOrder: 'asc',
            filters: {
              showInactiveMembers: {
                label: 'Show inactive members',
                value: false,
              },
            },
            search: '',
          },
        }),
      );
      const action = await firstValueFrom(effects.refetchFilteredMembers$);

      expect(action).toEqual(MembersActions.fetchFilteredMembersRequested());
    });

    it('should check for stale members as soon as it starts', () => {
      vi.useFakeTimers();
      store.overrideSelector(MembersSelectors.selectLastFilteredFetch, null);
      store.overrideSelector(NavSelectors.selectCurrentPath, '/members');
      store.refreshState();
      mockIsExpired.mockReturnValue(true);
      const results: Action[] = [];

      effects.refetchFilteredMembers$.subscribe(action => results.push(action));
      vi.advanceTimersByTime(0);

      expect(results).toEqual([MembersActions.fetchFilteredMembersRequested()]);
    });

    it('should trigger refetch when last fetch is expired', () => {
      vi.useFakeTimers();
      const expiredTimestamp = moment().subtract(20, 'minutes').toISOString();
      store.overrideSelector(MembersSelectors.selectLastFilteredFetch, expiredTimestamp);
      store.overrideSelector(NavSelectors.selectCurrentPath, '/members');
      store.refreshState();
      mockIsExpired.mockReturnValue(true);

      const results: Action[] = [];
      effects.refetchFilteredMembers$.subscribe(action => {
        results.push(action);
      });

      vi.advanceTimersByTime(3000);
      vi.advanceTimersByTime(10 * 60 * 1000);

      expect(results[0]).toEqual(MembersActions.fetchFilteredMembersRequested());
      expect(mockIsExpired).toHaveBeenCalledWith(expiredTimestamp);
    });

    it('should not trigger refetch when last fetch is not expired', () => {
      vi.useFakeTimers();
      const recentTimestamp = moment().subtract(5, 'minutes').toISOString();
      store.overrideSelector(MembersSelectors.selectLastFilteredFetch, recentTimestamp);
      store.overrideSelector(NavSelectors.selectCurrentPath, '/members');
      store.refreshState();
      mockIsExpired.mockReturnValue(false);

      const results: Action[] = [];
      effects.refetchFilteredMembers$.subscribe(action => {
        results.push(action);
      });

      vi.advanceTimersByTime(3000);
      vi.advanceTimersByTime(10 * 60 * 1000);

      expect(results).toHaveLength(0);
    });
  });

  describe('fetchMember$', () => {
    it('should fetch a single member successfully', async () => {
      const mockResponse: ApiResponse<Member> = { data: MOCK_MEMBERS[0] };
      membersApiService.getMember.mockReturnValue(of(mockResponse));

      actions$.next(
        MembersActions.fetchMemberRequested({ memberId: MOCK_MEMBERS[0].id }),
      );
      const action = await firstValueFrom(effects.fetchMember$);

      expect(action).toEqual(
        MembersActions.fetchMemberSucceeded({
          member: MOCK_MEMBERS[0],
          scope: 'admin',
        }),
      );
      expect(membersApiService.getMember).toHaveBeenCalledWith(MOCK_MEMBERS[0].id);
    });

    it('should handle fetch member failure', async () => {
      membersApiService.getMember.mockReturnValue(throwError(() => mockError));
      mockParseError.mockReturnValue(mockError);

      actions$.next(MembersActions.fetchMemberRequested({ memberId: 'invalid-id' }));
      const action = await firstValueFrom(effects.fetchMember$);

      expect(action).toEqual(MembersActions.fetchMemberFailed({ error: mockError }));
    });
  });

  describe('fetchMemberByNumber$', () => {
    it('should fetch a member by number in the viewer scope', async () => {
      store.overrideSelector(AuthSelectors.selectApiScope, 'admin');
      store.refreshState();
      const mockResponse: ApiResponse<Member> = { data: MOCK_MEMBERS[0] };
      membersApiService.getMemberByNumber.mockReturnValue(of(mockResponse));

      actions$.next(MembersActions.fetchMemberByNumberRequested({ memberNumber: 0 }));
      const action = await firstValueFrom(effects.fetchMemberByNumber$);

      expect(action).toEqual(
        MembersActions.fetchMemberSucceeded({
          member: MOCK_MEMBERS[0],
          scope: 'admin',
        }),
      );
      expect(membersApiService.getMemberByNumber).toHaveBeenCalledWith(0, 'admin');
    });

    it('should handle fetch member by number failure', async () => {
      store.overrideSelector(AuthSelectors.selectApiScope, 'public');
      store.refreshState();
      membersApiService.getMemberByNumber.mockReturnValue(throwError(() => mockError));
      mockParseError.mockReturnValue(mockError);

      actions$.next(MembersActions.fetchMemberByNumberRequested({ memberNumber: 999 }));
      const action = await firstValueFrom(effects.fetchMemberByNumber$);

      expect(action).toEqual(MembersActions.fetchMemberFailed({ error: mockError }));
    });
  });

  describe('addMember$', () => {
    beforeEach(() => {
      store.overrideSelector(AuthSelectors.selectUser, mockUser);
      store.refreshState();
    });

    it('should add member successfully', async () => {
      const mockAddResponse: ApiResponse<Member> = { data: MOCK_MEMBERS[0] };

      membersApiService.addMember.mockReturnValue(of(mockAddResponse));

      actions$.next(MembersActions.addMemberRequested({ notifyMember: false }));
      const action = await firstValueFrom(effects.addMember$);

      expect(action).toEqual(
        MembersActions.addMemberSucceeded({
          member: MOCK_MEMBERS[0],
          emailSent: null,
        }),
      );
      expect(membersApiService.addMember).toHaveBeenCalledWith(
        expect.objectContaining({
          modificationInfo: expect.objectContaining({
            createdBy: 'Test User',
            lastEditedBy: 'Test User',
          }),
        }),
        false,
      );
    });

    it('should report the welcome email when the new member is emailed', async () => {
      membersApiService.addMember.mockReturnValue(of({ data: MOCK_MEMBERS[0] }));

      actions$.next(MembersActions.addMemberRequested({ notifyMember: true }));
      const action = await firstValueFrom(effects.addMember$);

      expect(action).toEqual(
        MembersActions.addMemberSucceeded({
          member: MOCK_MEMBERS[0],
          emailSent: 'welcome',
        }),
      );
      expect(membersApiService.addMember).toHaveBeenCalledWith(expect.anything(), true);
    });

    it('should handle add member failure', async () => {
      membersApiService.addMember.mockReturnValue(throwError(() => mockError));
      mockParseError.mockReturnValue(mockError);

      actions$.next(MembersActions.addMemberRequested({ notifyMember: false }));
      const action = await firstValueFrom(effects.addMember$);

      expect(action).toEqual(MembersActions.addMemberFailed({ error: mockError }));
    });
  });

  describe('updateMember$', () => {
    beforeEach(() => {
      store.overrideSelector(AuthSelectors.selectUser, mockUser);
      store.refreshState();
      mockGetNewPeakRating.mockReturnValue('2900');
    });

    it('should update member successfully', async () => {
      const memberId = MOCK_MEMBERS[0].id;
      const mockUpdateResponse: ApiResponse<Member> = { data: MOCK_MEMBERS[0] };

      membersApiService.updateMember.mockReturnValue(of(mockUpdateResponse));

      actions$.next(
        MembersActions.updateMemberRequested({ memberId, notifyMember: false }),
      );
      const action = await firstValueFrom(effects.updateMember$);

      expect(action).toEqual(
        MembersActions.updateMemberSucceeded({
          member: MOCK_MEMBERS[0],
          originalMemberName: `${MOCK_MEMBERS[0].firstName} ${MOCK_MEMBERS[0].lastName}`,
          emailSent: null,
        }),
      );
      expect(membersApiService.updateMember).toHaveBeenCalledWith(
        memberId,
        expect.objectContaining({
          modificationInfo: expect.objectContaining({ lastEditedBy: 'Test User' }),
        }),
        false,
      );
      expect(membersApiService.updateMember.mock.calls[0][1]).not.toHaveProperty('id');
    });

    it('should report the changes email for a member with an account', async () => {
      const memberId = MOCK_MEMBERS[0].id;
      membersApiService.updateMember.mockReturnValue(of({ data: MOCK_MEMBERS[0] }));

      actions$.next(
        MembersActions.updateMemberRequested({ memberId, notifyMember: true }),
      );
      const action = await firstValueFrom(effects.updateMember$);

      expect(action).toEqual(expect.objectContaining({ emailSent: 'changes' }));
      expect(membersApiService.updateMember).toHaveBeenCalledWith(
        memberId,
        expect.anything(),
        true,
      );
    });

    it('should report the welcome email for a member given an account', async () => {
      const memberId = MOCK_MEMBERS[2].id;
      const savedMember: Member = { ...MOCK_MEMBERS[2], hasAccount: true };
      membersApiService.updateMember.mockReturnValue(of({ data: savedMember }));

      actions$.next(
        MembersActions.updateMemberRequested({ memberId, notifyMember: true }),
      );
      const action = await firstValueFrom(effects.updateMember$);

      expect(action).toEqual(
        expect.objectContaining({ member: savedMember, emailSent: 'welcome' }),
      );
    });

    it('should handle update member failure', async () => {
      const memberId = MOCK_MEMBERS[0].id;

      membersApiService.updateMember.mockReturnValue(throwError(() => mockError));
      mockParseError.mockReturnValue(mockError);

      actions$.next(
        MembersActions.updateMemberRequested({ memberId, notifyMember: false }),
      );
      const action = await firstValueFrom(effects.updateMember$);

      expect(action).toEqual(MembersActions.updateMemberFailed({ error: mockError }));
    });
  });

  describe('deleteMember$', () => {
    it('should delete member successfully', async () => {
      const mockDeleteResponse: ApiResponse<string> = { data: MOCK_MEMBERS[0].id };
      membersApiService.deleteMember.mockReturnValue(of(mockDeleteResponse));

      actions$.next(MembersActions.deleteMemberRequested({ member: MOCK_MEMBERS[0] }));
      const action = await firstValueFrom(effects.deleteMember$);

      expect(action).toEqual(
        MembersActions.deleteMemberSucceeded({
          memberId: MOCK_MEMBERS[0].id,
          memberName: `${MOCK_MEMBERS[0].firstName} ${MOCK_MEMBERS[0].lastName}`,
        }),
      );
      expect(membersApiService.deleteMember).toHaveBeenCalledWith(MOCK_MEMBERS[0].id);
    });

    it('should handle delete member failure', async () => {
      membersApiService.deleteMember.mockReturnValue(throwError(() => mockError));
      mockParseError.mockReturnValue(mockError);

      actions$.next(MembersActions.deleteMemberRequested({ member: MOCK_MEMBERS[0] }));
      const action = await firstValueFrom(effects.deleteMember$);

      expect(action).toEqual(MembersActions.deleteMemberFailed({ error: mockError }));
    });
  });

  describe('exportMembersToCsv$', () => {
    beforeEach(() => {
      store.overrideSelector(AuthSelectors.selectApiScope, 'admin');
      store.refreshState();
    });

    it('should export members to CSV successfully', async () => {
      const exportedCount = 5;
      membersApiService.getAllMembers.mockReturnValue(of(mockApiResponse));
      mockExportDataToCsv.mockReturnValue(exportedCount);

      actions$.next(MembersActions.exportMembersToCsvRequested());
      const action = await firstValueFrom(effects.exportMembersToCsv$);

      expect(action).toEqual(
        MembersActions.exportMembersToCsvSucceeded({ exportedCount }),
      );
      expect(membersApiService.getAllMembers).toHaveBeenCalledWith('admin');
      expect(mockExportDataToCsv).toHaveBeenCalledWith(
        mockApiResponse.data.items,
        expect.stringMatching(/^members_export_\d{4}-\d{2}-\d{2}\.csv$/),
      );
    });

    it('should handle export failure when exportDataToCsv returns error', async () => {
      const exportError: LccError = {
        name: 'LCCError',
        message: 'Export failed',
      };
      membersApiService.getAllMembers.mockReturnValue(of(mockApiResponse));
      mockExportDataToCsv.mockReturnValue(exportError);

      actions$.next(MembersActions.exportMembersToCsvRequested());
      const action = await firstValueFrom(effects.exportMembersToCsv$);

      expect(action).toEqual(
        MembersActions.exportMembersToCsvFailed({ error: exportError }),
      );
    });

    it('should report an export failure when the members cannot be fetched', async () => {
      membersApiService.getAllMembers.mockReturnValue(throwError(() => mockError));
      mockParseError.mockReturnValue(mockError);

      actions$.next(MembersActions.exportMembersToCsvRequested());
      const action = await firstValueFrom(effects.exportMembersToCsv$);

      expect(action).toEqual(
        MembersActions.exportMembersToCsvFailed({ error: mockError }),
      );
      expect(mockExportDataToCsv).not.toHaveBeenCalled();
    });
  });

  describe('updateMemberRatings$', () => {
    beforeEach(() => {
      store.overrideSelector(AuthSelectors.selectUser, mockUser);
      store.refreshState();
    });

    it('should update member ratings successfully', async () => {
      const membersWithNewRatings = [
        { ...MOCK_MEMBERS[0], newRating: '2900', newPeakRating: '2900' },
        { ...MOCK_MEMBERS[1], newRating: '2800', newPeakRating: '2850' },
      ];
      const mockUpdateResponse: ApiResponse<MemberRatingsUpdate> = {
        data: {
          updatedIds: [MOCK_MEMBERS[0].id, MOCK_MEMBERS[1].id],
          unnotifiedMemberNames: ['Magnus Carlsen'],
        },
      };

      membersApiService.updateMembers.mockReturnValue(of(mockUpdateResponse));

      actions$.next(
        MembersActions.updateMemberRatingsRequested({ membersWithNewRatings }),
      );
      const action = await firstValueFrom(effects.updateMemberRatings$);

      expect(action.type).toBe(MembersActions.updateMemberRatingsSucceeded.type);
      const payload = action as ReturnType<
        typeof MembersActions.updateMemberRatingsSucceeded
      >;
      expect(payload.members).toHaveLength(2);
      expect(payload.members[0].rating).toBe('2900');
      expect(payload.members[1].rating).toBe('2800');
      expect(payload.unnotifiedMemberNames).toEqual(['Magnus Carlsen']);
      expect(membersApiService.updateMembers).toHaveBeenCalledWith([
        expect.objectContaining({ id: MOCK_MEMBERS[0].id, rating: '2900' }),
        expect.objectContaining({ id: MOCK_MEMBERS[1].id, rating: '2800' }),
      ]);
      expect(membersApiService.updateMembers.mock.calls[0][0][0]).not.toHaveProperty(
        'number',
      );
    });

    it('should handle update member ratings failure', async () => {
      const membersWithNewRatings = [
        { ...MOCK_MEMBERS[0], newRating: '2900', newPeakRating: '2900' },
      ];

      membersApiService.updateMembers.mockReturnValue(throwError(() => mockError));
      mockParseError.mockReturnValue(mockError);

      actions$.next(
        MembersActions.updateMemberRatingsRequested({ membersWithNewRatings }),
      );
      const action = await firstValueFrom(effects.updateMemberRatings$);

      expect(action).toEqual(
        MembersActions.updateMemberRatingsFailed({ error: mockError }),
      );
    });
  });
});
