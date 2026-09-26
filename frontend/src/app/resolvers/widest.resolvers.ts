import { Store } from '@ngrx/store';
import { Observable, of } from 'rxjs';
import { catchError, filter, map, switchMap, take, tap } from 'rxjs/operators';

import { inject } from '@angular/core';
import { ResolveFn } from '@angular/router';

import { ApiResponse, Event, Game, Member } from '@app/models';
import { EventsApiService, GamesApiService, MembersApiService } from '@app/services';
import { AuthSelectors } from '@app/store/auth';
import { TournamentsActions, TournamentsSelectors } from '@app/store/tournaments';

// A table sized by these rows holds its widths from the first skeleton to the last page.
// Without them the page still opens, and its columns fit the rows as they arrive
function rowsOrNone<T>(response: Observable<ApiResponse<T[]>>): Observable<T[]> {
  return response.pipe(
    map(({ data }) => data),
    catchError(() => of([])),
  );
}

export const widestGamesResolver: ResolveFn<Game[]> = () =>
  rowsOrNone(inject(GamesApiService).getWidestGames());

export const widestEventsResolver: ResolveFn<Event[]> = () =>
  rowsOrNone(inject(EventsApiService).getWidestEvents());

export const widestMembersResolver: ResolveFn<Member[]> = () => {
  const membersApi = inject(MembersApiService);
  return inject(Store)
    .select(AuthSelectors.selectApiScope)
    .pipe(
      take(1),
      switchMap(scope => rowsOrNone(membersApi.getWidestMembers(scope))),
    );
};

// Every tournament fits in one list, which is its own widest, so the page opens once it is in
export const tournamentsResolver: ResolveFn<boolean> = () => {
  const store = inject(Store);
  const status$ = store.select(TournamentsSelectors.selectSummariesStatus);
  return status$.pipe(
    take(1),
    tap(status => {
      if (status !== 'loaded') {
        store.dispatch(TournamentsActions.fetchTournamentsRequested());
      }
    }),
    switchMap(() =>
      status$.pipe(
        filter(status => status !== 'loading'),
        take(1),
      ),
    ),
    map(() => true),
  );
};
