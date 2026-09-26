import { provideMockActions } from '@ngrx/effects/testing';
import { Action } from '@ngrx/store';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { Observable, ReplaySubject } from 'rxjs';

import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, UrlTree } from '@angular/router';

import { MOCK_TOURNAMENTS } from '@app/mocks/tournaments.mock';
import { TournamentsActions, initialState } from '@app/store/tournaments';
import { tournamentsAdapter } from '@app/store/tournaments/tournaments.reducer';

import { tournamentGuard } from './tournament.guard';

describe('tournamentGuard', () => {
  const tournament = MOCK_TOURNAMENTS[0];

  let actions$: ReplaySubject<Action>;
  let router: Router;
  let store: MockStore;
  let dispatchSpy: MockInstance;

  const runGuard = (tournamentNumber: string) =>
    TestBed.runInInjectionContext(() =>
      tournamentGuard('tournament_number')(
        Object.assign(new ActivatedRouteSnapshot(), {
          params: { tournament_number: tournamentNumber },
        }),
        router.routerState.snapshot,
      ),
    );

  const outcomes = (tournamentNumber: string): (boolean | UrlTree)[] => {
    const emitted: (boolean | UrlTree)[] = [];
    (runGuard(tournamentNumber) as Observable<boolean | UrlTree>).subscribe(value =>
      emitted.push(value),
    );
    return emitted;
  };

  beforeEach(() => {
    actions$ = new ReplaySubject<Action>(1);

    TestBed.configureTestingModule({
      providers: [
        provideMockActions(() => actions$),
        provideMockStore({ initialState: { tournamentsState: initialState } }),
      ],
    });

    router = TestBed.inject(Router);
    store = TestBed.inject(MockStore);
    dispatchSpy = vi.spyOn(store, 'dispatch');
  });

  it('should redirect home when the tournament number is malformed', () => {
    const result = runGuard('090');

    expect(result).toEqual(router.createUrlTree(['/']));
  });

  it('should show a stored tournament without fetching it again', () => {
    store.setState({
      tournamentsState: tournamentsAdapter.addOne(tournament, initialState),
    });

    const emitted = outcomes(String(tournament.number));

    expect(emitted).toEqual([true]);
    expect(dispatchSpy).not.toHaveBeenCalled();
  });

  it('should fetch a missing tournament by number and show it once it arrives', () => {
    const emitted = outcomes(String(tournament.number));

    store.setState({
      tournamentsState: tournamentsAdapter.addOne(tournament, initialState),
    });

    expect(dispatchSpy).toHaveBeenCalledWith(
      TournamentsActions.fetchTournamentRequested({
        tournamentNumber: tournament.number,
      }),
    );
    expect(emitted).toEqual([true]);
  });

  it('should redirect home when the tournament does not exist', () => {
    const emitted = outcomes(String(tournament.number));

    actions$.next(
      TournamentsActions.fetchTournamentFailed({
        error: { name: 'LCCError', message: 'Not found', status: 404 },
      }),
    );

    expect(emitted).toEqual([router.createUrlTree(['/'])]);
  });
});
