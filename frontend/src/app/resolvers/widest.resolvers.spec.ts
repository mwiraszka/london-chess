import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { Observable, firstValueFrom, of, throwError } from 'rxjs';

import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';

import { MOCK_GAMES } from '@app/mocks/games.mock';
import { Game } from '@app/models';
import { GamesApiService } from '@app/services';
import { TournamentsActions, TournamentsSelectors } from '@app/store/tournaments';

import { tournamentsResolver, widestGamesResolver } from './widest.resolvers';

describe('widest resolvers', () => {
  const route = {} as ActivatedRouteSnapshot;
  const state = {} as RouterStateSnapshot;

  describe('widestGamesResolver', () => {
    const resolve = (response: Observable<{ data: Game[] }>) => {
      TestBed.configureTestingModule({
        providers: [
          { provide: GamesApiService, useValue: { getWidestGames: () => response } },
        ],
      });
      return firstValueFrom(
        TestBed.runInInjectionContext(
          () => widestGamesResolver(route, state) as Observable<Game[]>,
        ),
      );
    };

    it('should resolve the widest games', async () => {
      expect(await resolve(of({ data: MOCK_GAMES }))).toEqual(MOCK_GAMES);
    });

    it('should open the page without them when they fail to load', async () => {
      expect(await resolve(throwError(() => new Error('Offline')))).toEqual([]);
    });
  });

  describe('tournamentsResolver', () => {
    let store: MockStore;

    beforeEach(() => {
      TestBed.configureTestingModule({ providers: [provideMockStore()] });
      store = TestBed.inject(MockStore);
    });

    const resolve = () =>
      TestBed.runInInjectionContext(
        () => tournamentsResolver(route, state) as Observable<boolean>,
      );

    it('should open the page at once when the tournaments are in', async () => {
      store.overrideSelector(TournamentsSelectors.selectSummariesStatus, 'loaded');
      const dispatchSpy = vi.spyOn(store, 'dispatch');

      expect(await firstValueFrom(resolve())).toBe(true);
      expect(dispatchSpy).not.toHaveBeenCalled();
    });

    it('should fetch the tournaments and open the page once they are in', async () => {
      const status = store.overrideSelector(
        TournamentsSelectors.selectSummariesStatus,
        'loading',
      );
      const dispatchSpy = vi.spyOn(store, 'dispatch');
      const resolved = firstValueFrom(resolve());

      status.setResult('loaded');
      store.refreshState();

      expect(await resolved).toBe(true);
      expect(dispatchSpy).toHaveBeenCalledWith(
        TournamentsActions.fetchTournamentsRequested(),
      );
    });
  });
});
