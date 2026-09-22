import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { BehaviorSubject } from 'rxjs';

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
import { MetaAndTitleService } from '@app/services';
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
        'Jane Smith vs John Doe',
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
        'Jane Smith (2000)',
        'John Doe',
        '½-½ (Draw)',
        'London System (D02)',
        '2',
      ]);
      expect(white.componentInstance.name()).toBe('Jane Smith');
      expect(white.componentInstance.memberNumber()).toBeNull();
      expect(black.componentInstance.name()).toBe('John Doe');
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

    it('should set the qualifying details apart', () => {
      expect(
        queryAll(fixture.debugElement, '.details__extra').map(extra =>
          extra.nativeElement.textContent.trim(),
        ),
      ).toEqual(['(A1)', '(Round 1)', '(2000)', '(Draw)', '(D02)']);
    });

    it('should offer the analysis board and the way back together', () => {
      const [analysis, back] = queryAll(fixture.debugElement, '.game__links a');

      expect(analysis.attributes['href']).toBe(
        getLichessAnalysisUrl(buildPgn(MOCK_GAMES[1])),
      );
      expect(back.injector.get(RouterLink).urlTree?.toString()).toBe('/game-archives');
    });

    it('should update the page title', () => {
      expect(TestBed.inject(MetaAndTitleService).updateTitle).toHaveBeenCalledWith(
        'Jane Smith vs John Doe',
      );
    });
  });

  describe('when the game is not in the store', () => {
    beforeEach(() => {
      store.setState(stateWith([]));
      fixture.detectChanges();
    });

    it('should leave fetching it to the guard on its route', () => {
      expect(dispatchSpy).not.toHaveBeenCalled();
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

    it('should offer only the way back while the game loads', () => {
      const links = queryAll(fixture.debugElement, '.game__links a');

      expect(links).toHaveLength(1);
      expect(links[0].injector.get(RouterLink).urlTree?.toString()).toBe(
        '/game-archives',
      );
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
      expect(query(fixture.debugElement, '.game__links a')).toBeTruthy();
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
      'John Doe vs H. Roe',
    );
  });
});
