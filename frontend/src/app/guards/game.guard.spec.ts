import { provideMockActions } from '@ngrx/effects/testing';
import { Action } from '@ngrx/store';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { Observable, ReplaySubject } from 'rxjs';

import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, UrlTree } from '@angular/router';

import { MOCK_GAMES } from '@app/mocks/games.mock';
import { GamesActions, initialState } from '@app/store/games';
import { gamesAdapter } from '@app/store/games/games.reducer';

import { gameGuard } from './game.guard';

describe('gameGuard', () => {
  const game = MOCK_GAMES[0];

  let actions$: ReplaySubject<Action>;
  let router: Router;
  let store: MockStore;
  let dispatchSpy: MockInstance;

  const runGuard = (gameId: string) =>
    TestBed.runInInjectionContext(() =>
      gameGuard('game_id')(
        Object.assign(new ActivatedRouteSnapshot(), { params: { game_id: gameId } }),
        router.routerState.snapshot,
      ),
    );

  const outcomes = (gameId: string): (boolean | UrlTree)[] => {
    const emitted: (boolean | UrlTree)[] = [];
    (runGuard(gameId) as Observable<boolean | UrlTree>).subscribe(value =>
      emitted.push(value),
    );
    return emitted;
  };

  beforeEach(() => {
    actions$ = new ReplaySubject<Action>(1);

    TestBed.configureTestingModule({
      providers: [
        provideMockActions(() => actions$),
        provideMockStore({ initialState: { gamesState: initialState } }),
      ],
    });

    router = TestBed.inject(Router);
    store = TestBed.inject(MockStore);
    dispatchSpy = vi.spyOn(store, 'dispatch');
  });

  it('should redirect home when the game id is malformed', () => {
    const result = runGuard('42');

    expect(result).toEqual(router.createUrlTree(['/']));
  });

  it('should show a stored game without fetching it again', () => {
    store.setState({ gamesState: gamesAdapter.addOne(game, initialState) });

    const emitted = outcomes(game.id);

    expect(emitted).toEqual([true]);
    expect(dispatchSpy).not.toHaveBeenCalled();
  });

  it('should fetch a missing game and show it once it arrives', () => {
    const emitted = outcomes(game.id);

    store.setState({ gamesState: gamesAdapter.addOne(game, initialState) });

    expect(dispatchSpy).toHaveBeenCalledWith(
      GamesActions.fetchGameRequested({ gameId: game.id }),
    );
    expect(emitted).toEqual([true]);
  });

  it('should redirect home when the game does not exist', () => {
    const emitted = outcomes(game.id);

    actions$.next(
      GamesActions.fetchGameFailed({
        error: { name: 'LCCError', message: 'Not found', status: 404 },
      }),
    );

    expect(emitted).toEqual([router.createUrlTree(['/'])]);
  });
});
