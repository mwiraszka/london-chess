import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { Observable, firstValueFrom, of, throwError } from 'rxjs';

import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';

import { MOCK_EVENTS } from '@app/mocks/events.mock';
import { MOCK_GAMES } from '@app/mocks/games.mock';
import { MOCK_MEMBERS } from '@app/mocks/members.mock';
import { ApiScope, Event, Game, Member } from '@app/models';
import { EventsApiService, GamesApiService, MembersApiService } from '@app/services';
import { AuthSelectors } from '@app/store/auth';
import { TournamentsActions, TournamentsSelectors } from '@app/store/tournaments';

import {
  tournamentsResolver,
  widestEventsResolver,
  widestGamesResolver,
  widestMembersResolver,
} from './widest.resolvers';

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

  describe('widestEventsResolver', () => {
    it('should resolve the widest events', async () => {
      TestBed.configureTestingModule({
        providers: [
          {
            provide: EventsApiService,
            useValue: { getWidestEvents: () => of({ data: MOCK_EVENTS }) },
          },
        ],
      });

      const events = await firstValueFrom(
        TestBed.runInInjectionContext(
          () => widestEventsResolver(route, state) as Observable<Event[]>,
        ),
      );

      expect(events).toEqual(MOCK_EVENTS);
    });
  });

  describe('widestMembersResolver', () => {
    afterEach(() => TestBed.inject(MockStore).resetSelectors());

    it.each<ApiScope>(['public', 'admin'])(
      'should resolve the widest members a %s visitor may see',
      async scope => {
        const getWidestMembers = vi.fn().mockReturnValue(of({ data: MOCK_MEMBERS }));
        TestBed.configureTestingModule({
          providers: [
            provideMockStore({
              selectors: [{ selector: AuthSelectors.selectApiScope, value: scope }],
            }),
            { provide: MembersApiService, useValue: { getWidestMembers } },
          ],
        });

        const members = await firstValueFrom(
          TestBed.runInInjectionContext(
            () => widestMembersResolver(route, state) as Observable<Member[]>,
          ),
        );

        expect(getWidestMembers).toHaveBeenCalledExactlyOnceWith(scope);
        expect(members).toEqual(MOCK_MEMBERS);
      },
    );
  });

  describe('tournamentsResolver', () => {
    let store: MockStore;

    beforeEach(() => {
      TestBed.configureTestingModule({ providers: [provideMockStore()] });
      store = TestBed.inject(MockStore);
    });

    afterEach(() => store.resetSelectors());

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

    it('should still open the page when the tournaments fail to load', async () => {
      const status = store.overrideSelector(
        TournamentsSelectors.selectSummariesStatus,
        'loading',
      );
      const resolved = firstValueFrom(resolve());

      status.setResult('failed');
      store.refreshState();

      expect(await resolved).toBe(true);
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
