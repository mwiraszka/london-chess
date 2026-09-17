import { provideMockActions } from '@ngrx/effects/testing';
import { Action } from '@ngrx/store';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import moment from 'moment-timezone';
import { ReplaySubject, of, throwError } from 'rxjs';

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { INITIAL_MEMBER_FORM_DATA } from '@app/constants';
import { MOCK_MEMBERS } from '@app/mocks/members.mock';
import {
  ApiResponse,
  LccError,
  Member,
  MemberRatingsUpdate,
  PaginatedItems,
  User,
} from '@app/models';
import { MemberProfilesService, MembersApiService, UserService } from '@app/services';
import { AuthSelectors } from '@app/store/auth';
import { NavSelectors } from '@app/store/nav';
import {
  EXPORT_DATA_TO_CSV,
  GET_NEW_PEAK_RATING,
  IS_EXPIRED,
  PARSE_ERROR,
} from '@app/tokens';

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
      newMemberFormData: INITIAL_MEMBER_FORM_DATA,
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
        { provide: UserService, useValue: { memberNumber: signal(null) } },
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

  describe('replacePublicRecordsForAdmin$', () => {
    it('should fetch every member for an admin while the stored records are public', () => {
      store.overrideSelector(AuthSelectors.selectIsAdmin, true);
      store.overrideSelector(MembersSelectors.selectRecordsScope, 'public');
      store.refreshState();
      const emitted: Action[] = [];

      effects.replacePublicRecordsForAdmin$.subscribe(action => emitted.push(action));

      expect(emitted).toEqual([MembersActions.fetchAllMembersRequested()]);
    });

    it('should not fetch when the stored records already came from the admin API', () => {
      store.overrideSelector(AuthSelectors.selectIsAdmin, true);
      store.overrideSelector(MembersSelectors.selectRecordsScope, 'admin');
      store.refreshState();
      const emitted: Action[] = [];

      effects.replacePublicRecordsForAdmin$.subscribe(action => emitted.push(action));

      expect(emitted).toEqual([]);
    });

    it('should not fetch for a visitor who is not an admin', () => {
      store.overrideSelector(AuthSelectors.selectIsAdmin, false);
      store.overrideSelector(MembersSelectors.selectRecordsScope, 'public');
      store.refreshState();
      const emitted: Action[] = [];

      effects.replacePublicRecordsForAdmin$.subscribe(action => emitted.push(action));

      expect(emitted).toEqual([]);
    });
  });

  describe('fetchAllMembers$', () => {
    beforeEach(() => {
      store.overrideSelector(AuthSelectors.selectApiScope, 'admin');
      store.refreshState();
    });

    it('should fetch all members successfully', () =>
      withDone(done => {
        membersApiService.getAllMembers.mockReturnValue(of(mockApiResponse));

        actions$.next(MembersActions.fetchAllMembersRequested());

        effects.fetchAllMembers$.subscribe(action => {
          expect(action).toEqual(
            MembersActions.fetchAllMembersSucceeded({
              members: mockApiResponse.data.items,
              totalCount: mockApiResponse.data.totalCount,
              scope: 'admin',
            }),
          );
          expect(membersApiService.getAllMembers).toHaveBeenCalledWith('admin');
          done();
        });
      }));

    it('should handle fetch all members failure', () =>
      withDone(done => {
        membersApiService.getAllMembers.mockReturnValue(throwError(() => mockError));
        mockParseError.mockReturnValue(mockError);

        actions$.next(MembersActions.fetchAllMembersRequested());

        effects.fetchAllMembers$.subscribe(action => {
          expect(action).toEqual(
            MembersActions.fetchAllMembersFailed({ error: mockError }),
          );
          expect(mockParseError).toHaveBeenCalledWith(mockError);
          done();
        });
      }));
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

    it('should fetch filtered members with options from store', () =>
      withDone(done => {
        membersApiService.getFilteredMembers.mockReturnValue(of(mockApiResponse));

        actions$.next(MembersActions.fetchFilteredMembersRequested());

        effects.fetchFilteredMembers$.subscribe(action => {
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
          done();
        });
      }));

    it('should handle fetch filtered members failure', () =>
      withDone(done => {
        membersApiService.getFilteredMembers.mockReturnValue(throwError(() => mockError));
        mockParseError.mockReturnValue(mockError);

        actions$.next(MembersActions.fetchFilteredMembersRequested());

        effects.fetchFilteredMembers$.subscribe(action => {
          expect(action).toEqual(
            MembersActions.fetchFilteredMembersFailed({ error: mockError }),
          );
          done();
        });
      }));
  });

  describe('refetchFilteredMembers$', () => {
    it('should trigger refetch after addMemberSucceeded', () =>
      withDone(done => {
        actions$.next(
          MembersActions.addMemberSucceeded({ member: MOCK_MEMBERS[0], emailSent: null }),
        );

        effects.refetchFilteredMembers$.subscribe(action => {
          expect(action).toEqual(MembersActions.fetchFilteredMembersRequested());
          done();
        });
      }));

    it('should trigger refetch after updateMemberSucceeded', () =>
      withDone(done => {
        actions$.next(
          MembersActions.updateMemberSucceeded({
            member: MOCK_MEMBERS[0],
            originalMemberName: 'Old Name',
            emailSent: null,
          }),
        );

        effects.refetchFilteredMembers$.subscribe(action => {
          expect(action).toEqual(MembersActions.fetchFilteredMembersRequested());
          done();
        });
      }));

    it('should trigger refetch after updateMemberRatingsSucceeded', () =>
      withDone(done => {
        actions$.next(
          MembersActions.updateMemberRatingsSucceeded({
            members: [MOCK_MEMBERS[0]],
            unnotifiedMemberNames: [],
          }),
        );

        effects.refetchFilteredMembers$.subscribe(action => {
          expect(action).toEqual(MembersActions.fetchFilteredMembersRequested());
          done();
        });
      }));

    it('should trigger refetch after deleteMemberSucceeded', () =>
      withDone(done => {
        actions$.next(
          MembersActions.deleteMemberSucceeded({
            memberId: MOCK_MEMBERS[0].id,
            memberName: 'Test Member',
          }),
        );

        effects.refetchFilteredMembers$.subscribe(action => {
          expect(action).toEqual(MembersActions.fetchFilteredMembersRequested());
          done();
        });
      }));

    it('should trigger refetch after paginationOptionsChanged', () =>
      withDone(done => {
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
            fetch: true,
          }),
        );

        effects.refetchFilteredMembers$.subscribe(action => {
          expect(action).toEqual(MembersActions.fetchFilteredMembersRequested());
          done();
        });
      }));

    it('should not refetch when the options change without asking for a fetch', () => {
      vi.useFakeTimers();
      mockIsExpired.mockReturnValue(false);
      const results: Action[] = [];
      effects.refetchFilteredMembers$.subscribe(action => results.push(action));

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
          fetch: false,
        }),
      );
      vi.advanceTimersByTime(0);

      expect(results).toHaveLength(0);
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
    it('should fetch a single member successfully', () =>
      withDone(done => {
        const mockResponse: ApiResponse<Member> = { data: MOCK_MEMBERS[0] };
        membersApiService.getMember.mockReturnValue(of(mockResponse));

        actions$.next(
          MembersActions.fetchMemberRequested({ memberId: MOCK_MEMBERS[0].id }),
        );

        effects.fetchMember$.subscribe(action => {
          expect(action).toEqual(
            MembersActions.fetchMemberSucceeded({
              member: MOCK_MEMBERS[0],
              scope: 'admin',
            }),
          );
          expect(membersApiService.getMember).toHaveBeenCalledWith(MOCK_MEMBERS[0].id);
          done();
        });
      }));

    it('should handle fetch member failure', () =>
      withDone(done => {
        membersApiService.getMember.mockReturnValue(throwError(() => mockError));
        mockParseError.mockReturnValue(mockError);

        actions$.next(MembersActions.fetchMemberRequested({ memberId: 'invalid-id' }));

        effects.fetchMember$.subscribe(action => {
          expect(action).toEqual(MembersActions.fetchMemberFailed({ error: mockError }));
          done();
        });
      }));
  });

  describe('fetchMemberByNumber$', () => {
    it('should fetch a member by number in the viewer scope', () =>
      withDone(done => {
        store.overrideSelector(AuthSelectors.selectApiScope, 'admin');
        store.refreshState();
        const mockResponse: ApiResponse<Member> = { data: MOCK_MEMBERS[0] };
        membersApiService.getMemberByNumber.mockReturnValue(of(mockResponse));

        actions$.next(MembersActions.fetchMemberByNumberRequested({ memberNumber: 0 }));

        effects.fetchMemberByNumber$.subscribe(action => {
          expect(action).toEqual(
            MembersActions.fetchMemberSucceeded({
              member: MOCK_MEMBERS[0],
              scope: 'admin',
            }),
          );
          expect(membersApiService.getMemberByNumber).toHaveBeenCalledWith(0, 'admin');
          done();
        });
      }));

    it('should handle fetch member by number failure', () =>
      withDone(done => {
        store.overrideSelector(AuthSelectors.selectApiScope, 'public');
        store.refreshState();
        membersApiService.getMemberByNumber.mockReturnValue(throwError(() => mockError));
        mockParseError.mockReturnValue(mockError);

        actions$.next(MembersActions.fetchMemberByNumberRequested({ memberNumber: 999 }));

        effects.fetchMemberByNumber$.subscribe(action => {
          expect(action).toEqual(MembersActions.fetchMemberFailed({ error: mockError }));
          done();
        });
      }));
  });

  describe('addMember$', () => {
    beforeEach(() => {
      store.overrideSelector(AuthSelectors.selectUser, mockUser);
      store.refreshState();
    });

    it('should add member successfully', () =>
      withDone(done => {
        const mockAddResponse: ApiResponse<Member> = { data: MOCK_MEMBERS[0] };

        membersApiService.addMember.mockReturnValue(of(mockAddResponse));

        actions$.next(MembersActions.addMemberRequested({ notifyMember: false }));

        effects.addMember$.subscribe(action => {
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
          done();
        });
      }));

    it('should report the welcome email when the new member is emailed', () =>
      withDone(done => {
        membersApiService.addMember.mockReturnValue(of({ data: MOCK_MEMBERS[0] }));

        actions$.next(MembersActions.addMemberRequested({ notifyMember: true }));

        effects.addMember$.subscribe(action => {
          expect(action).toEqual(
            MembersActions.addMemberSucceeded({
              member: MOCK_MEMBERS[0],
              emailSent: 'welcome',
            }),
          );
          expect(membersApiService.addMember).toHaveBeenCalledWith(
            expect.anything(),
            true,
          );
          done();
        });
      }));

    it('should handle add member failure', () =>
      withDone(done => {
        membersApiService.addMember.mockReturnValue(throwError(() => mockError));
        mockParseError.mockReturnValue(mockError);

        actions$.next(MembersActions.addMemberRequested({ notifyMember: false }));

        effects.addMember$.subscribe(action => {
          expect(action).toEqual(MembersActions.addMemberFailed({ error: mockError }));
          done();
        });
      }));
  });

  describe('updateMember$', () => {
    beforeEach(() => {
      store.overrideSelector(AuthSelectors.selectUser, mockUser);
      store.refreshState();
      mockGetNewPeakRating.mockReturnValue('2900');
    });

    it('should update member successfully', () =>
      withDone(done => {
        const memberId = MOCK_MEMBERS[0].id;
        const mockUpdateResponse: ApiResponse<Member> = { data: MOCK_MEMBERS[0] };

        membersApiService.updateMember.mockReturnValue(of(mockUpdateResponse));

        actions$.next(
          MembersActions.updateMemberRequested({ memberId, notifyMember: false }),
        );

        effects.updateMember$.subscribe(action => {
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
          expect(membersApiService.updateMember.mock.calls[0][1]).not.toHaveProperty(
            'id',
          );
          done();
        });
      }));

    it('should report the changes email for a member with an account', () =>
      withDone(done => {
        const memberId = MOCK_MEMBERS[0].id;
        membersApiService.updateMember.mockReturnValue(of({ data: MOCK_MEMBERS[0] }));

        actions$.next(
          MembersActions.updateMemberRequested({ memberId, notifyMember: true }),
        );

        effects.updateMember$.subscribe(action => {
          expect(action).toEqual(expect.objectContaining({ emailSent: 'changes' }));
          expect(membersApiService.updateMember).toHaveBeenCalledWith(
            memberId,
            expect.anything(),
            true,
          );
          done();
        });
      }));

    it('should report the welcome email for a member given an account', () =>
      withDone(done => {
        const memberId = MOCK_MEMBERS[2].id;
        const savedMember: Member = { ...MOCK_MEMBERS[2], hasAccount: true };
        membersApiService.updateMember.mockReturnValue(of({ data: savedMember }));

        actions$.next(
          MembersActions.updateMemberRequested({ memberId, notifyMember: true }),
        );

        effects.updateMember$.subscribe(action => {
          expect(action).toEqual(
            expect.objectContaining({ member: savedMember, emailSent: 'welcome' }),
          );
          done();
        });
      }));

    it('should handle update member failure', () =>
      withDone(done => {
        const memberId = MOCK_MEMBERS[0].id;

        membersApiService.updateMember.mockReturnValue(throwError(() => mockError));
        mockParseError.mockReturnValue(mockError);

        actions$.next(
          MembersActions.updateMemberRequested({ memberId, notifyMember: false }),
        );

        effects.updateMember$.subscribe(action => {
          expect(action).toEqual(MembersActions.updateMemberFailed({ error: mockError }));
          done();
        });
      }));
  });

  describe('deleteMember$', () => {
    it('should delete member successfully', () =>
      withDone(done => {
        const mockDeleteResponse: ApiResponse<string> = { data: MOCK_MEMBERS[0].id };
        membersApiService.deleteMember.mockReturnValue(of(mockDeleteResponse));

        actions$.next(MembersActions.deleteMemberRequested({ member: MOCK_MEMBERS[0] }));

        effects.deleteMember$.subscribe(action => {
          expect(action).toEqual(
            MembersActions.deleteMemberSucceeded({
              memberId: MOCK_MEMBERS[0].id,
              memberName: `${MOCK_MEMBERS[0].firstName} ${MOCK_MEMBERS[0].lastName}`,
            }),
          );
          expect(membersApiService.deleteMember).toHaveBeenCalledWith(MOCK_MEMBERS[0].id);
          done();
        });
      }));

    it('should handle delete member failure', () =>
      withDone(done => {
        membersApiService.deleteMember.mockReturnValue(throwError(() => mockError));
        mockParseError.mockReturnValue(mockError);

        actions$.next(MembersActions.deleteMemberRequested({ member: MOCK_MEMBERS[0] }));

        effects.deleteMember$.subscribe(action => {
          expect(action).toEqual(MembersActions.deleteMemberFailed({ error: mockError }));
          done();
        });
      }));
  });

  describe('exportMembersToCsv$', () => {
    beforeEach(() => {
      store.overrideSelector(AuthSelectors.selectApiScope, 'admin');
      store.refreshState();
    });

    it('should export members to CSV successfully', () =>
      withDone(done => {
        const exportedCount = 5;
        membersApiService.getAllMembers.mockReturnValue(of(mockApiResponse));
        mockExportDataToCsv.mockReturnValue(exportedCount);

        actions$.next(MembersActions.exportMembersToCsvRequested());

        effects.exportMembersToCsv$.subscribe(action => {
          expect(action).toEqual(
            MembersActions.exportMembersToCsvSucceeded({ exportedCount }),
          );
          expect(membersApiService.getAllMembers).toHaveBeenCalledWith('admin');
          expect(mockExportDataToCsv).toHaveBeenCalledWith(
            mockApiResponse.data.items,
            expect.stringMatching(/^members_export_\d{4}-\d{2}-\d{2}\.csv$/),
          );
          done();
        });
      }));

    it('should handle export failure when exportDataToCsv returns error', () =>
      withDone(done => {
        const exportError: LccError = {
          name: 'LCCError',
          message: 'Export failed',
        };
        membersApiService.getAllMembers.mockReturnValue(of(mockApiResponse));
        mockExportDataToCsv.mockReturnValue(exportError);

        actions$.next(MembersActions.exportMembersToCsvRequested());

        effects.exportMembersToCsv$.subscribe(action => {
          expect(action).toEqual(
            MembersActions.exportMembersToCsvFailed({ error: exportError }),
          );
          done();
        });
      }));

    it('should report an export failure when the members cannot be fetched', () =>
      withDone(done => {
        membersApiService.getAllMembers.mockReturnValue(throwError(() => mockError));
        mockParseError.mockReturnValue(mockError);

        actions$.next(MembersActions.exportMembersToCsvRequested());

        effects.exportMembersToCsv$.subscribe(action => {
          expect(action).toEqual(
            MembersActions.exportMembersToCsvFailed({ error: mockError }),
          );
          expect(mockExportDataToCsv).not.toHaveBeenCalled();
          done();
        });
      }));
  });

  describe('updateMemberRatings$', () => {
    beforeEach(() => {
      store.overrideSelector(AuthSelectors.selectUser, mockUser);
      store.refreshState();
    });

    it('should update member ratings successfully', () =>
      withDone(done => {
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

        effects.updateMemberRatings$.subscribe(action => {
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
          done();
        });
      }));

    it('should handle update member ratings failure', () =>
      withDone(done => {
        const membersWithNewRatings = [
          { ...MOCK_MEMBERS[0], newRating: '2900', newPeakRating: '2900' },
        ];

        membersApiService.updateMembers.mockReturnValue(throwError(() => mockError));
        mockParseError.mockReturnValue(mockError);

        actions$.next(
          MembersActions.updateMemberRatingsRequested({ membersWithNewRatings }),
        );

        effects.updateMemberRatings$.subscribe(action => {
          expect(action).toEqual(
            MembersActions.updateMemberRatingsFailed({ error: mockError }),
          );
          done();
        });
      }));
  });
});
