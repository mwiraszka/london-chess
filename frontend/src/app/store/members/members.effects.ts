import { Actions, createEffect, ofType } from '@ngrx/effects';
import { concatLatestFrom } from '@ngrx/operators';
import { routerNavigatedAction } from '@ngrx/router-store';
import { Store } from '@ngrx/store';
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
} from 'rxjs/operators';

import { Injectable, inject } from '@angular/core';

import { Member } from '@app/models';
import { MembersApiService } from '@app/services';
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
      concatLatestFrom(() => this.store.select(AuthSelectors.selectIsAdmin)),
      switchMap(([{ memberId }, isAdmin]) => {
        return this.membersApiService.getMember(memberId, isAdmin).pipe(
          map(response => MembersActions.fetchMemberSucceeded({ member: response.data })),
          catchError(error =>
            of(MembersActions.fetchMemberFailed({ error: this.parseError(error) })),
          ),
        );
      }),
    );
  });

  addMember$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(MembersActions.addMemberRequested),
      concatLatestFrom(() => [
        this.store.select(MembersSelectors.selectMemberFormDataById(null)),
        this.store.select(AuthSelectors.selectUser).pipe(filter(isDefined)),
      ]),
      concatMap(([, formData, user]) => {
        const member: Member = {
          ...formData,
          id: '',
          peakRating: formData.rating,
          modificationInfo: {
            createdBy: `${user.firstName} ${user.lastName}`,
            dateCreated: moment().toISOString(),
            lastEditedBy: `${user.firstName} ${user.lastName}`,
            dateLastEdited: moment().toISOString(),
          },
        };

        return this.membersApiService.addMember(member).pipe(
          map(response =>
            MembersActions.addMemberSucceeded({
              member: { ...member, id: response.data },
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
      concatMap(([, member, formData, user]) => {
        const updatedMember: Member = {
          ...member,
          ...formData,
          peakRating: this.getNewPeakRating(formData.rating, formData.peakRating),
          modificationInfo: {
            ...member.modificationInfo,
            lastEditedBy: `${user.firstName} ${user.lastName}`,
            dateLastEdited: moment().toISOString(),
          },
        };

        return this.membersApiService.updateMember(updatedMember).pipe(
          filter(response => response.data === updatedMember.id),
          map(() =>
            MembersActions.updateMemberSucceeded({
              member: updatedMember,
              originalMemberName: `${member.firstName} ${member.lastName}`,
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
                dateLastEdited: moment().toISOString(),
              },
            };
          },
        );

        return this.membersApiService.updateMembers(updatedMembers).pipe(
          map(() =>
            MembersActions.updateMemberRatingsSucceeded({ members: updatedMembers }),
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
}
