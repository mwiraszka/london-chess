import { Actions, createEffect, ofType } from '@ngrx/effects';
import { concatLatestFrom } from '@ngrx/operators';
import { routerNavigatedAction } from '@ngrx/router-store';
import { Store } from '@ngrx/store';
import moment from 'moment-timezone';
import { of } from 'rxjs';
import {
  catchError,
  concatMap,
  exhaustMap,
  filter,
  map,
  mergeMap,
  switchMap,
  take,
} from 'rxjs/operators';

import { Injectable, inject } from '@angular/core';

import { ModificationInfo, User } from '@app/models';
import { TournamentsApiService, UserService } from '@app/services';
import * as AppActions from '@app/store/app/app.actions';
import * as AuthSelectors from '@app/store/auth/auth.selectors';
import { IS_EXPIRED, PARSE_ERROR } from '@app/tokens';
import { isDefined } from '@app/utils';

import * as TournamentsActions from './tournaments.actions';
import * as TournamentsSelectors from './tournaments.selectors';

@Injectable()
export class TournamentsEffects {
  private readonly actions$ = inject(Actions);
  private readonly isExpired = inject(IS_EXPIRED);
  private readonly parseError = inject(PARSE_ERROR);
  private readonly store = inject(Store);
  private readonly tournamentsApiService = inject(TournamentsApiService);
  private readonly userService = inject(UserService);

  fetchTournaments$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(TournamentsActions.fetchTournamentsRequested),
      switchMap(() =>
        this.tournamentsApiService.getTournaments().pipe(
          map(response =>
            TournamentsActions.fetchTournamentsSucceeded({ summaries: response.data }),
          ),
          catchError(error =>
            of(
              TournamentsActions.fetchTournamentsFailed({
                error: this.parseError(error),
              }),
            ),
          ),
        ),
      ),
    );
  });

  refetchTournaments$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(routerNavigatedAction),
      filter(({ payload }) => payload.event.url.split(/[?#]/)[0] === '/tournaments'),
      switchMap(() =>
        this.store.select(TournamentsSelectors.selectLastSummariesFetch).pipe(take(1)),
      ),
      filter(lastFetch => this.isExpired(lastFetch)),
      map(() => TournamentsActions.fetchTournamentsRequested()),
    );
  });

  refetchTournamentsOnRefresh$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(AppActions.refreshAppRequested),
      concatLatestFrom(() =>
        this.store.select(TournamentsSelectors.selectLastSummariesFetch),
      ),
      filter(([, lastFetch]) => lastFetch !== null),
      map(() => TournamentsActions.fetchTournamentsRequested()),
    );
  });

  fetchTournament$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(TournamentsActions.fetchTournamentRequested),
      switchMap(({ tournamentNumber }) =>
        this.tournamentsApiService.getTournament(tournamentNumber).pipe(
          map(response =>
            TournamentsActions.fetchTournamentSucceeded({ tournament: response.data }),
          ),
          catchError(error =>
            of(
              TournamentsActions.fetchTournamentFailed({ error: this.parseError(error) }),
            ),
          ),
        ),
      ),
    );
  });

  fetchMemberTournaments$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(TournamentsActions.fetchMemberTournamentsRequested),
      switchMap(({ memberNumber }) =>
        this.tournamentsApiService.getMemberTournaments(memberNumber).pipe(
          map(response =>
            TournamentsActions.fetchMemberTournamentsSucceeded({
              memberNumber,
              results: response.data,
            }),
          ),
          catchError(error =>
            of(
              TournamentsActions.fetchMemberTournamentsFailed({
                error: this.parseError(error),
              }),
            ),
          ),
        ),
      ),
    );
  });

  addTournament$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(TournamentsActions.addTournamentRequested),
      concatLatestFrom(() => [
        this.store.select(TournamentsSelectors.selectTournamentFormData(null)),
        this.store.select(AuthSelectors.selectUser).pipe(filter(isDefined)),
      ]),
      concatMap(([, formData, user]) =>
        this.tournamentsApiService
          .addTournament({ ...formData, modificationInfo: this.credit(user, null) })
          .pipe(
            map(response =>
              TournamentsActions.addTournamentSucceeded({
                tournamentNumber: response.data,
                tournamentName: formData.name,
              }),
            ),
            catchError(error =>
              of(
                TournamentsActions.addTournamentFailed({ error: this.parseError(error) }),
              ),
            ),
          ),
      ),
    );
  });

  updateTournament$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(TournamentsActions.updateTournamentRequested),
      concatLatestFrom(({ tournamentNumber }) => [
        this.store
          .select(TournamentsSelectors.selectTournamentByNumber(tournamentNumber))
          .pipe(filter(isDefined)),
        this.store.select(
          TournamentsSelectors.selectTournamentFormData(tournamentNumber),
        ),
        this.store.select(AuthSelectors.selectUser).pipe(filter(isDefined)),
      ]),
      concatMap(([{ tournamentNumber }, tournament, formData, user]) =>
        this.tournamentsApiService
          .updateTournament(tournamentNumber, {
            ...formData,
            modificationInfo: this.credit(user, tournament.modificationInfo),
          })
          .pipe(
            map(() =>
              TournamentsActions.updateTournamentSucceeded({
                tournamentNumber,
                tournamentName: formData.name,
              }),
            ),
            catchError(error =>
              of(
                TournamentsActions.updateTournamentFailed({
                  error: this.parseError(error),
                }),
              ),
            ),
          ),
      ),
    );
  });

  deleteTournament$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(TournamentsActions.deleteTournamentRequested),
      mergeMap(({ tournamentNumber, tournamentName }) =>
        this.tournamentsApiService.deleteTournament(tournamentNumber).pipe(
          map(() =>
            TournamentsActions.deleteTournamentSucceeded({
              tournamentNumber,
              tournamentName,
            }),
          ),
          catchError(error =>
            of(
              TournamentsActions.deleteTournamentFailed({
                error: this.parseError(error),
              }),
            ),
          ),
        ),
      ),
    );
  });

  register$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(TournamentsActions.registrationRequested),
      exhaustMap(({ tournamentNumber, tournamentName }) =>
        this.tournamentsApiService.register(tournamentNumber).pipe(
          map(response =>
            TournamentsActions.registrationSucceeded({
              tournamentNumber,
              tournamentName,
              registrants: response.data,
            }),
          ),
          catchError(error =>
            of(TournamentsActions.registrationFailed({ error: this.parseError(error) })),
          ),
        ),
      ),
    );
  });

  withdraw$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(TournamentsActions.withdrawalRequested),
      exhaustMap(({ tournamentNumber, tournamentName }) =>
        this.tournamentsApiService.withdraw(tournamentNumber).pipe(
          map(response =>
            TournamentsActions.withdrawalSucceeded({
              tournamentNumber,
              tournamentName,
              registrants: response.data,
            }),
          ),
          catchError(error =>
            of(TournamentsActions.withdrawalFailed({ error: this.parseError(error) })),
          ),
        ),
      ),
    );
  });

  private credit(user: User, original: ModificationInfo | null): ModificationInfo {
    const name = `${user.firstName} ${user.lastName}`;
    const number = this.userService.memberNumber();
    const now = moment().toISOString();
    return {
      createdBy: original?.createdBy ?? name,
      createdByNumber: original ? original.createdByNumber : number,
      dateCreated: original?.dateCreated ?? now,
      lastEditedBy: name,
      lastEditedByNumber: number,
      dateLastEdited: now,
    };
  }
}
