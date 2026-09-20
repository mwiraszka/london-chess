import { Actions, createEffect, ofType } from '@ngrx/effects';
import { concatLatestFrom } from '@ngrx/operators';
import { routerNavigatedAction } from '@ngrx/router-store';
import { Store } from '@ngrx/store';
import { of } from 'rxjs';
import { catchError, filter, map, switchMap, take } from 'rxjs/operators';

import { Injectable, inject } from '@angular/core';

import { TournamentsApiService } from '@app/services';
import * as AppActions from '@app/store/app/app.actions';
import { IS_EXPIRED, PARSE_ERROR } from '@app/tokens';

import * as TournamentsActions from './tournaments.actions';
import * as TournamentsSelectors from './tournaments.selectors';

@Injectable()
export class TournamentsEffects {
  private readonly actions$ = inject(Actions);
  private readonly isExpired = inject(IS_EXPIRED);
  private readonly parseError = inject(PARSE_ERROR);
  private readonly store = inject(Store);
  private readonly tournamentsApiService = inject(TournamentsApiService);

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
}
