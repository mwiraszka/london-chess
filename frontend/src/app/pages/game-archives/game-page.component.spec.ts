import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { BehaviorSubject, firstValueFrom } from 'rxjs';

import { Component, input } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  ActivatedRoute,
  ParamMap,
  RouterLink,
  convertToParamMap,
  provideRouter,
} from '@angular/router';

import { PgnViewerComponent } from '@app/components/pgn-viewer/pgn-viewer.component';
import { INITIAL_GAMES_QUERY, PLACEHOLDER_GAME } from '@app/constants/games';
import { MOCK_GAMES } from '@app/mocks/games.mock';
import { Game } from '@app/models';
import { KEEP_SCROLL, MetaAndTitleService } from '@app/services';
import { GamesActions, GamesState, initialState } from '@app/store/games';
import { gamesAdapter } from '@app/store/games/games.reducer';
import {
  buildPgn,
  getLichessAnalysisUrl,
  query,
  queryAll,
  queryTextContent,
} from '@app/utils';

import { GamePageComponent } from './game-page.component';

@Component({ selector: 'lcc-pgn-viewer', template: '' })
class PgnViewerStubComponent {
  readonly game = input.required<Game>();
}

describe('GamePageComponent', () => {
  let fixture: ComponentFixture<GamePageComponent>;
  let component: GamePageComponent;
  let store: MockStore;

  let dispatchSpy: MockInstance;
  let paramMap: BehaviorSubject<ParamMap>;

  const stateWith = (games: Game[], overrides: Partial<GamesState> = {}) => ({
    gamesState: gamesAdapter.setAll(games, {
      ...initialState,
      filteredGames: games,
      filteredCount: games.length || null,
      lastFilteredFetch: games.length ? '2026-01-15T10:00:00.000Z' : null,
      query: {
        ...INITIAL_GAMES_QUERY,
        filters: { ...INITIAL_GAMES_QUERY.filters, year: 1994 },
      },
      ...overrides,
    }),
  });

  beforeEach(async () => {
    paramMap = new BehaviorSubject(convertToParamMap({ id: MOCK_GAMES[1].id }));

    await TestBed.configureTestingModule({
      imports: [GamePageComponent],
      providers: [
        provideMockStore({ initialState: stateWith(MOCK_GAMES) }),
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { paramMap: paramMap.asObservable() } },
        {
          provide: MetaAndTitleService,
          useValue: { updateTitle: vi.fn(), updateDescription: vi.fn() },
        },
      ],
    })
      .overrideComponent(GamePageComponent, {
        remove: { imports: [PgnViewerComponent] },
        add: { imports: [PgnViewerStubComponent] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(GamePageComponent);
    component = fixture.componentInstance;
    store = TestBed.inject(MockStore);

    dispatchSpy = vi.spyOn(store, 'dispatch');
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('when the game is in the store', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should not fetch it again', () => {
      expect(dispatchSpy).not.toHaveBeenCalled();
    });

    it('should head the page with the players', () => {
      expect(queryTextContent(fixture.debugElement, '.page-heading')).toBe(
        'Sasha Chen vs Gerry Litchfield',
      );
    });

    it('should list the game details', () => {
      const [white, black] = queryAll(fixture.debugElement, '.details lcc-member-link');

      expect(
        queryAll(fixture.debugElement, '.details dd').map(dd =>
          dd.nativeElement.textContent.replace(/\s+/g, ' ').trim(),
        ),
      ).toEqual([
        'Club Championship (A1)',
        'December 7, 2023 (Round 1)',
        MOCK_GAMES[1].location,
        'Sasha Chen (2000)',
        'Gerry Litchfield',
        '½-½ (Draw)',
        'London System (D02)',
        '2',
      ]);
      expect(white.componentInstance.name()).toBe('Sasha Chen');
      expect(white.componentInstance.memberNumber()).toBeNull();
      expect(black.componentInstance.name()).toBe('Gerry Litchfield');
      expect(black.componentInstance.memberNumber()).toBe(2);
      expect(queryAll(fixture.debugElement, '.details dt')).toHaveLength(8);
    });

    it('should hand the game to the board', () => {
      const viewer: PgnViewerStubComponent = query(
        fixture.debugElement,
        'lcc-pgn-viewer',
      ).componentInstance;

      expect(viewer.game()).toEqual(MOCK_GAMES[1]);
    });

    it('should link to the games either side within the results', () => {
      const [previous, next] = queryAll(fixture.debugElement, '.game__nav ea-button').map(
        button => button.injector.get(RouterLink).urlTree?.toString(),
      );

      expect(previous).toBe(`/game-archives/${MOCK_GAMES[0].id}`);
      expect(next).toBe(`/game-archives/${MOCK_GAMES[2].id}`);
    });

    it('should keep the scroll position when moving to a neighbouring game', () => {
      const links = queryAll(fixture.debugElement, '.game__nav ea-button').map(button =>
        button.injector.get(RouterLink),
      );

      expect(links.map(link => link.info)).toEqual([KEEP_SCROLL, KEEP_SCROLL]);
    });

    it('should say where the game sits within the results', () => {
      expect(queryTextContent(fixture.debugElement, '.game__position')).toBe(
        'Game 2 of 3',
      );
    });

    it('should set the qualifying details apart', () => {
      expect(
        queryAll(fixture.debugElement, '.details__extra').map(extra =>
          extra.nativeElement.textContent.trim(),
        ),
      ).toEqual(['(A1)', '(Round 1)', '(2000)', '(Draw)', '(D02)']);
    });

    it('should link to the game on the Lichess analysis board', () => {
      const link = query(fixture.debugElement, '.game__analysis a');

      expect(link.attributes['href']).toBe(
        getLichessAnalysisUrl(buildPgn(MOCK_GAMES[1])),
      );
    });

    it('should hide the neighbouring game links when the game is on its own', () => {
      store.setState(stateWith([MOCK_GAMES[1]]));
      fixture.detectChanges();

      expect(query(fixture.debugElement, '.game__nav')).toBeFalsy();
    });

    it('should link back to the archives with the query that was open', async () => {
      const vm = await firstValueFrom(component.viewModel$!);
      const back = query(fixture.debugElement, '.game__back a');

      expect(vm.archiveLink.queryParams).toEqual({ year: 1994 });
      expect(back.injector.get(RouterLink).urlTree?.toString()).toBe(
        '/game-archives?year=1994',
      );
    });

    it('should update the page title', () => {
      expect(TestBed.inject(MetaAndTitleService).updateTitle).toHaveBeenCalledWith(
        'Sasha Chen vs Gerry Litchfield',
      );
    });
  });

  describe('when the game is not in the store', () => {
    beforeEach(() => {
      store.setState(stateWith([]));
      fixture.detectChanges();
    });

    it('should fetch it', () => {
      expect(dispatchSpy).toHaveBeenCalledWith(
        GamesActions.fetchGameRequested({ gameId: MOCK_GAMES[1].id }),
      );
    });

    it('should hold the page layout with skeletons until the game arrives', () => {
      expect(query(fixture.debugElement, '.game[aria-busy="true"]')).toBeTruthy();
      expect(query(fixture.debugElement, '.page-heading lcc-text-skeleton')).toBeTruthy();
      expect(query(fixture.debugElement, '.game__details ea-skeleton')).toBeTruthy();
      expect(query(fixture.debugElement, '.game__board ea-skeleton')).toBeTruthy();
    });

    it('should lay out a placeholder game under the skeletons', () => {
      const viewer: PgnViewerStubComponent = query(
        fixture.debugElement,
        'lcc-pgn-viewer',
      ).componentInstance;

      expect(viewer.game()).toEqual(PLACEHOLDER_GAME);
      expect(queryAll(fixture.debugElement, '.details dt')).toHaveLength(8);
    });

    it('should offer only the way back while the game is not among any results', () => {
      expect(query(fixture.debugElement, '.game__nav')).toBeFalsy();
      expect(
        query(fixture.debugElement, '.game__back a')
          .injector.get(RouterLink)
          .urlTree?.toString(),
      ).toBe('/game-archives?year=1994');
    });
  });

  describe('when the game fails to load', () => {
    beforeEach(() => {
      store.setState(stateWith([], { failedLoads: ['game'] }));
      fixture.detectChanges();
    });

    it('should render a failure panel in place of the page', () => {
      expect(query(fixture.debugElement, 'lcc-load-failed')).toBeTruthy();
      expect(query(fixture.debugElement, 'lcc-page-header')).toBeFalsy();
      expect(query(fixture.debugElement, 'lcc-pgn-viewer')).toBeFalsy();
      expect(query(fixture.debugElement, '.game__back a')).toBeTruthy();
    });

    it('should fetch the game again on retry', () => {
      dispatchSpy.mockClear();

      query(fixture.debugElement, 'lcc-load-failed').triggerEventHandler('retry');

      expect(dispatchSpy).toHaveBeenCalledWith(
        GamesActions.fetchGameRequested({ gameId: MOCK_GAMES[1].id }),
      );
    });
  });

  it('should follow the route to another game', () => {
    fixture.detectChanges();

    paramMap.next(convertToParamMap({ id: MOCK_GAMES[0].id }));
    fixture.detectChanges();

    expect(queryTextContent(fixture.debugElement, '.page-heading')).toBe(
      'Gerry Litchfield vs H. Jung',
    );
  });
});
