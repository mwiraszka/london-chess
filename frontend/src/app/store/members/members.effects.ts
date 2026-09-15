import { Actions, createEffect, ofType } from '@ngrx/effects';
import { concatLatestFrom } from '@ngrx/operators';
import { routerNavigatedAction } from '@ngrx/router-store';
import { Store } from '@ngrx/store';
import { pick } from 'lodash';
import moment from 'moment-timezone';
import { combineLatest, merge, of, timer } from 'rxjs';
import {
  catchError,
  concatMap,
  filter,
  map,
  mergeMap,
  switchMap,
  take,
  tap,
} from 'rxjs/operators';

import { Injectable, inject } from '@angular/core';

import { MEMBER_FORM_DATA_PROPERTIES } from '@app/constants';
import { EditableMember, Member, MemberEmail } from '@app/models';
import { MemberProfilesService, MembersApiService, UserService } from '@app/services';
import { AppActions } from '@app/store/app';
import { AuthSelectors } from '@app/store/auth';
import { NavSelectors } from '@app/store/nav';
import {
  EXPORT_DATA_TO_CSV,
  GET_NEW_PEAK_RATING,
  IS_EXPIRED,
  PARSE_ERROR,
} from '@app/tokens';
import { isDefined } from '@app/utils';

import { MembersActions, MembersSelectors } from '.';

@Injectable()
export class MembersEffects {
  private readonly parseError = inject(PARSE_ERROR);
  private readonly isExpired = inject(IS_EXPIRED);
  private readonly exportDataToCsv = inject(EXPORT_DATA_TO_CSV);
  private readonly getNewPeakRating = inject(GET_NEW_PEAK_RATING);
  private readonly memberProfiles = inject(MemberProfilesService);
  private readonly userService = inject(UserService);

  // A saved member may have a new name or a new profile, and names shown by member
  // number come from the profiles
  reloadMemberProfiles$ = createEffect(
    () => {
      return this.actions$.pipe(
        ofType(
          MembersActions.addMemberSucceeded,
          MembersActions.updateMemberSucceeded,
          AppActions.refreshAppRequested,
        ),
        tap(() => void this.memberProfiles.reload()),
      );
    },
    { dispatch: false },
  );

  fetchAllMembers$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(MembersActions.fetchAllMembersRequested),
      concatLatestFrom(() => this.store.select(AuthSelectors.selectIsAdmin)),
      switchMap(([, isAdmin]) =>
        this.membersApiService.getAllMembers(isAdmin).pipe(
          map(response =>
            MembersActions.fetchAllMembersSucceeded({
              members: response.data.items,
              totalCount: response.data.totalCount,
            }),
          ),
          catchError(error =>
            of(MembersActions.fetchAllMembersFailed({ error: this.parseError(error) })),
          ),
        ),
      ),
    );
  });

  fetchFilteredMembers$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(
        MembersActions.fetchFilteredMembersRequested,
        MembersActions.fetchFilteredMembersInBackgroundRequested,
      ),
      concatLatestFrom(() => [
        this.store.select(AuthSelectors.selectIsAdmin),
        this.store.select(MembersSelectors.selectOptions),
      ]),
      switchMap(([, isAdmin, options]) =>
        this.membersApiService.getFilteredMembers(isAdmin, options).pipe(
          map(response =>
            MembersActions.fetchFilteredMembersSucceeded({
              members: response.data.items,
              filteredCount: response.data.filteredCount,
              totalCount: response.data.totalCount,
            }),
          ),
          catchError(error =>
            of(
              MembersActions.fetchFilteredMembersFailed({
                error: this.parseError(error),
              }),
            ),
          ),
        ),
      ),
    );
  });

  refetchFilteredMembers$ = createEffect(() => {
    const refetchActions$ = this.actions$.pipe(
      ofType(
        AppActions.refreshAppRequested,
        MembersActions.addMemberSucceeded,
        MembersActions.updateMemberSucceeded,
        MembersActions.deleteMemberSucceeded,
        MembersActions.paginationOptionsChanged,
      ),
    );

    const timerCheck$ = timer(6500, 10 * 60 * 1000).pipe(
      switchMap(() =>
        combineLatest([
          this.store.select(MembersSelectors.selectLastFilteredFetch),
          this.store.select(NavSelectors.selectCurrentPath),
        ]).pipe(take(1)),
      ),
      filter(
        ([lastFetch, currentPath]) =>
          this.isExpired(lastFetch) && !!currentPath?.includes('/member'),
      ),
    );

    const routerCheck$ = this.actions$.pipe(
      ofType(routerNavigatedAction),
      filter(({ payload }) => payload.event.url.includes('/member')),
      switchMap(() =>
        this.store.select(MembersSelectors.selectLastFilteredFetch).pipe(take(1)),
      ),
      filter(lastFetch => this.isExpired(lastFetch)),
    );

    const periodicCheck$ = merge(timerCheck$, routerCheck$);

    return merge(refetchActions$, periodicCheck$).pipe(
      map(() => MembersActions.fetchFilteredMembersInBackgroundRequested()),
    );
  });

  fetchMember$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(MembersActions.fetchMemberRequested),
      switchMap(({ memberId }) =>
        this.membersApiService.getMember(memberId).pipe(
          map(response => MembersActions.fetchMemberSucceeded({ member: response.data })),
          catchError(error =>
            of(MembersActions.fetchMemberFailed({ error: this.parseError(error) })),
          ),
        ),
      ),
    );
  });

  fetchMemberByNumber$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(MembersActions.fetchMemberByNumberRequested),
      concatLatestFrom(() => this.store.select(AuthSelectors.selectIsAdmin)),
      switchMap(([{ memberNumber }, isAdmin]) =>
        this.membersApiService.getMemberByNumber(memberNumber, isAdmin).pipe(
          map(response => MembersActions.fetchMemberSucceeded({ member: response.data })),
          catchError(error =>
            of(MembersActions.fetchMemberFailed({ error: this.parseError(error) })),
          ),
        ),
      ),
    );
  });

  addMember$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(MembersActions.addMemberRequested),
      concatLatestFrom(() => [
        this.store.select(MembersSelectors.selectMemberFormDataById(null)),
        this.store.select(AuthSelectors.selectUser).pipe(filter(isDefined)),
      ]),
      concatMap(([{ notifyMember }, formData, user]) => {
        const member: EditableMember = {
          ...formData,
          peakRating: formData.rating,
          modificationInfo: {
            createdBy: `${user.firstName} ${user.lastName}`,
            createdByNumber: this.userService.memberNumber(),
            dateCreated: moment().toISOString(),
            lastEditedBy: `${user.firstName} ${user.lastName}`,
            lastEditedByNumber: this.userService.memberNumber(),
            dateLastEdited: moment().toISOString(),
          },
        };

        return this.membersApiService.addMember(member, notifyMember).pipe(
          map(response =>
            MembersActions.addMemberSucceeded({
              member: response.data,
              emailSent: notifyMember ? 'welcome' : null,
            }),
          ),
          catchError(error =>
            of(MembersActions.addMemberFailed({ error: this.parseError(error) })),
          ),
        );
      }),
    );
  });

  updateMember$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(MembersActions.updateMemberRequested),
      concatLatestFrom(({ memberId }) => [
        this.store
          .select(MembersSelectors.selectMemberById(memberId))
          .pipe(filter(isDefined)),
        this.store.select(MembersSelectors.selectMemberFormDataById(memberId)),
        this.store.select(AuthSelectors.selectUser).pipe(filter(isDefined)),
      ]),
      concatMap(([{ notifyMember }, member, formData, user]) => {
        const editableMember: EditableMember = {
          ...formData,
          peakRating: this.getNewPeakRating(formData.rating, formData.peakRating),
          modificationInfo: {
            ...member.modificationInfo,
            lastEditedBy: `${user.firstName} ${user.lastName}`,
            lastEditedByNumber: this.userService.memberNumber(),
            dateLastEdited: moment().toISOString(),
          },
        };

        return this.membersApiService
          .updateMember(member.id, editableMember, notifyMember)
          .pipe(
            filter(response => response.data.id === member.id),
            map(response =>
              MembersActions.updateMemberSucceeded({
                member: response.data,
                originalMemberName: `${member.firstName} ${member.lastName}`,
                emailSent: this.emailSentOnUpdate(member, notifyMember),
              }),
            ),
            catchError(error =>
              of(MembersActions.updateMemberFailed({ error: this.parseError(error) })),
            ),
          );
      }),
    );
  });

  deleteMember$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(MembersActions.deleteMemberRequested),
      mergeMap(({ member }) =>
        this.membersApiService.deleteMember(member.id).pipe(
          filter(response => response.data === member.id),
          map(() =>
            MembersActions.deleteMemberSucceeded({
              memberId: member.id,
              memberName: `${member.firstName} ${member.lastName}`,
            }),
          ),
          catchError(error =>
            of(MembersActions.deleteMemberFailed({ error: this.parseError(error) })),
          ),
        ),
      ),
    );
  });

  exportMembersToCsv$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(MembersActions.exportMembersToCsvRequested),
      concatLatestFrom(() => this.store.select(AuthSelectors.selectIsAdmin)),
      mergeMap(([, isAdmin]) => {
        return this.membersApiService.getAllMembers(isAdmin).pipe(
          map(response => {
            const filename = `members_export_${new Date().toISOString().split('T')[0]}.csv`;
            const exportResult = this.exportDataToCsv(response.data.items, filename);

            return typeof exportResult === 'number'
              ? MembersActions.exportMembersToCsvSucceeded({
                  exportedCount: exportResult,
                })
              : MembersActions.exportMembersToCsvFailed({ error: exportResult });
          }),
          catchError(error =>
            of(MembersActions.fetchAllMembersFailed({ error: this.parseError(error) })),
          ),
        );
      }),
    );
  });

  updateMemberRatings$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(MembersActions.updateMemberRatingsRequested),
      concatLatestFrom(() =>
        this.store.select(AuthSelectors.selectUser).pipe(filter(isDefined)),
      ),
      concatMap(([{ membersWithNewRatings }, user]) => {
        const updatedMembers: Member[] = membersWithNewRatings.map(
          memberWithNewRatings => {
            const { newRating, newPeakRating, ...member } = memberWithNewRatings;

            return {
              ...member,
              rating: newRating,
              peakRating: newPeakRating,
              modificationInfo: {
                ...member.modificationInfo,
                lastEditedBy: `${user.firstName} ${user.lastName}`,
                lastEditedByNumber: this.userService.memberNumber(),
                dateLastEdited: moment().toISOString(),
              },
            };
          },
        );

        const editableMembers = updatedMembers.map(member => ({
          id: member.id,
          ...pick(member, MEMBER_FORM_DATA_PROPERTIES),
          modificationInfo: member.modificationInfo,
        }));

        return this.membersApiService.updateMembers(editableMembers).pipe(
          map(response =>
            MembersActions.updateMemberRatingsSucceeded({
              members: updatedMembers,
              unnotifiedMemberNames: response.data.unnotifiedMemberNames,
            }),
          ),
          catchError(error =>
            of(
              MembersActions.updateMemberRatingsFailed({ error: this.parseError(error) }),
            ),
          ),
        );
      }),
    );
  });

  constructor(
    private readonly actions$: Actions,
    private readonly membersApiService: MembersApiService,
    private readonly store: Store,
  ) {}

  // A member without an account gets one along with their welcome email
  private emailSentOnUpdate(member: Member, notifyMember: boolean): MemberEmail | null {
    if (!notifyMember) {
      return null;
    }
    return member.hasAccount ? 'changes' : 'welcome';
  }
}
