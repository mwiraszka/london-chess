import { Actions, createEffect, ofType } from '@ngrx/effects';
import { concatLatestFrom } from '@ngrx/operators';
import { routerNavigatedAction } from '@ngrx/router-store';
import { Store } from '@ngrx/store';
import { forkJoin, of } from 'rxjs';
import { catchError, filter, map, switchMap, take } from 'rxjs/operators';

import { Injectable, inject } from '@angular/core';

import { GamesApiService } from '@app/services';
import * as AppActions from '@app/store/app/app.actions';
import { IS_EXPIRED, PARSE_ERROR } from '@app/tokens';

import * as GamesActions from './games.actions';
import * as GamesSelectors from './games.selectors';

@Injectable()
export class GamesEffects {
  private readonly actions$ = inject(Actions);
  private readonly gamesApiService = inject(GamesApiService);
  private readonly isExpired = inject(IS_EXPIRED);
  private readonly parseError = inject(PARSE_ERROR);
  private readonly store = inject(Store);

  fetchFilteredGames$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(GamesActions.fetchFilteredGamesRequested),
      concatLatestFrom(() => this.store.select(GamesSelectors.selectQuery)),
      switchMap(([, query]) =>
        this.gamesApiService.getGames(query).pipe(
          map(response =>
            GamesActions.fetchFilteredGamesSucceeded({
              games: response.data.items,
              filteredCount: response.data.filteredCount,
            }),
          ),
          catchError(error =>
            of(GamesActions.fetchFilteredGamesFailed({ error: this.parseError(error) })),
          ),
        ),
      ),
    );
  });

  refetchFilteredGames$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(GamesActions.queryChanged, AppActions.refreshAppRequested),
      concatLatestFrom(() => this.store.select(GamesSelectors.selectLastFilteredFetch)),
      // A refresh only concerns results that have been shown
      filter(
        ([action, lastFetch]) =>
          action.type === GamesActions.queryChanged.type || lastFetch !== null,
      ),
      map(() => GamesActions.fetchFilteredGamesRequested()),
    );
  });

  fetchGame$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(GamesActions.fetchGameRequested),
      switchMap(({ gameId }) =>
        this.gamesApiService.getGame(gameId).pipe(
          map(response => GamesActions.fetchGameSucceeded({ game: response.data })),
          catchError(error =>
            of(GamesActions.fetchGameFailed({ error: this.parseError(error) })),
          ),
        ),
      ),
    );
  });

  fetchArchiveReference$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(GamesActions.fetchArchiveReferenceRequested),
      switchMap(() =>
        forkJoin({
          players: this.gamesApiService.getPlayers(),
          tournaments: this.gamesApiService.getTournaments(),
          summary: this.gamesApiService.getSummary(),
        }).pipe(
          map(({ players, tournaments, summary }) =>
            GamesActions.fetchArchiveReferenceSucceeded({
              players: players.data,
              tournaments: tournaments.data,
              summary: summary.data,
            }),
          ),
          catchError(error =>
            of(
              GamesActions.fetchArchiveReferenceFailed({ error: this.parseError(error) }),
            ),
          ),
        ),
      ),
    );
  });

  refetchArchiveReference$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(routerNavigatedAction),
      filter(({ payload }) => payload.event.url.startsWith('/game-archives')),
      switchMap(() =>
        this.store.select(GamesSelectors.selectLastReferenceFetch).pipe(take(1)),
      ),
      filter(lastFetch => this.isExpired(lastFetch)),
      map(() => GamesActions.fetchArchiveReferenceRequested()),
    );
  });

  refetchArchiveReferenceOnRefresh$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(AppActions.refreshAppRequested),
      concatLatestFrom(() => this.store.select(GamesSelectors.selectLastReferenceFetch)),
      filter(([, lastFetch]) => lastFetch !== null),
      map(() => GamesActions.fetchArchiveReferenceRequested()),
    );
  });
}
