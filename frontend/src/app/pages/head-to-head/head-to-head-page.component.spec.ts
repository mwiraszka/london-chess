import { DropdownComponent, SelectOption } from '@eagami/ui';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { isEqual } from 'lodash-es';
import { BehaviorSubject } from 'rxjs';

import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  ActivatedRoute,
  ParamMap,
  Router,
  convertToParamMap,
  provideRouter,
} from '@angular/router';

import { MOCK_HEAD_TO_HEAD_GAMES } from '@app/mocks/games.mock';
import { MOCK_MEMBER_TOURNAMENT_RESULTS } from '@app/mocks/tournaments.mock';
import { HeadToHeadGame, LoadStatus, MemberProfile } from '@app/models';
import { MemberProfilesService, MetaAndTitleService } from '@app/services';
import { GamesActions, initialState as gamesInitialState } from '@app/store/games';
import { GamesState } from '@app/store/games/games.reducer';
import {
  TournamentsActions,
  initialState as tournamentsInitialState,
} from '@app/store/tournaments';
import { TournamentsState } from '@app/store/tournaments/tournaments.reducer';
import { query, queryAll, queryTextContent } from '@app/utils';

import { HeadToHeadPageComponent } from './head-to-head-page.component';

describe('HeadToHeadPageComponent', () => {
  let fixture: ComponentFixture<HeadToHeadPageComponent>;
  let store: MockStore;
  let queryParamMap: BehaviorSubject<ParamMap>;
  let metaAndTitleService: Mocked<
    Pick<MetaAndTitleService, 'updateTitle' | 'updateDescription'>
  >;
  let memberProfiles: Pick<
    MemberProfilesService,
    'all' | 'load' | 'profileFor' | 'status'
  >;

  const profilesStatus = signal<LoadStatus>('loaded');

  const PROFILES: MemberProfile[] = [
    {
      number: 2,
      firstName: 'John',
      lastName: 'Doe',
      rating: '1850',
      peakRating: '1900',
      avatarUrl: null,
    },
    {
      number: 7,
      firstName: 'Jane',
      lastName: 'Smith',
      rating: '1700/5',
      peakRating: '1700/5',
      avatarUrl: null,
    },
  ];

  function setState(
    games: Partial<GamesState> = {},
    tournaments: Partial<TournamentsState> = {},
  ): void {
    store.setState({
      gamesState: { ...gamesInitialState, ...games },
      tournamentsState: { ...tournamentsInitialState, ...tournaments },
    });
  }

  function compare(blue: string | null, red: string | null): void {
    const params: Record<string, string> = {};
    if (blue !== null) {
      params['blue'] = blue;
    }
    if (red !== null) {
      params['red'] = red;
    }
    queryParamMap.next(convertToParamMap(params));
  }

  function createComponent(): void {
    fixture = TestBed.createComponent(HeadToHeadPageComponent);
    fixture.detectChanges();
  }

  const dropdowns = (): DropdownComponent[] =>
    queryAll(fixture.debugElement, 'ea-dropdown').map(el => el.componentInstance);

  const loaded = (games: HeadToHeadGame[] = MOCK_HEAD_TO_HEAD_GAMES) => {
    setState(
      { headToHead: { '2-7': games } },
      { memberResults: { 2: MOCK_MEMBER_TOURNAMENT_RESULTS, 7: [] } },
    );
  };

  beforeEach(() => {
    metaAndTitleService = { updateTitle: vi.fn(), updateDescription: vi.fn() };
    queryParamMap = new BehaviorSubject(convertToParamMap({}));
    profilesStatus.set('loaded');
    memberProfiles = {
      all: signal(PROFILES).asReadonly(),
      status: profilesStatus.asReadonly(),
      load: vi.fn(() => Promise.resolve()),
      profileFor: number => PROFILES.find(profile => profile.number === number) ?? null,
    };

    TestBed.configureTestingModule({
      imports: [HeadToHeadPageComponent],
      providers: [
        provideRouter([]),
        provideMockStore({
          initialState: {
            gamesState: gamesInitialState,
            tournamentsState: tournamentsInitialState,
          },
        }),
        { provide: ActivatedRoute, useValue: { queryParamMap } },
        { provide: MemberProfilesService, useValue: memberProfiles },
        { provide: MetaAndTitleService, useValue: metaAndTitleService },
      ],
    });

    store = TestBed.inject(MockStore);
  });

  it('should set the title and description and load the members', () => {
    createComponent();

    expect(metaAndTitleService.updateTitle).toHaveBeenCalledWith('Head to Head');
    expect(metaAndTitleService.updateDescription).toHaveBeenCalled();
    expect(memberProfiles.load).toHaveBeenCalled();
  });

  it('should ask for two members until both are chosen', () => {
    compare('2', null);

    createComponent();

    expect(queryTextContent(fixture.debugElement, '.prompt')).toContain(
      'Choose two members',
    );
    expect(query(fixture.debugElement, 'ea-accordion')).toBeFalsy();
  });

  it('should offer every member on each side but the one chosen on the other', () => {
    compare('2', null);

    createComponent();

    const [first, second] = dropdowns();
    expect(first.value()).toBe('2');
    expect(second.value()).toBe('');
    expect(second.options()).toEqual<SelectOption[]>([
      { value: '2', label: 'John Doe', disabled: true },
      { value: '7', label: 'Jane Smith', disabled: false },
    ]);
  });

  it('should keep the members chosen in the address', () => {
    compare('2', null);
    createComponent();
    const navigateSpy = vi
      .spyOn(TestBed.inject(Router), 'navigate')
      .mockResolvedValue(true);

    query(
      fixture.debugElement,
      '.contender__body--second ea-dropdown',
    ).triggerEventHandler('changed', '7');

    expect(navigateSpy).toHaveBeenCalledWith(
      [],
      expect.objectContaining({
        queryParams: { red: '7' },
        queryParamsHandling: 'merge',
        replaceUrl: true,
      }),
    );
  });

  it('should swap the members between the cards, which keep their colours', () => {
    compare('2', '7');
    createComponent();
    const navigateSpy = vi
      .spyOn(TestBed.inject(Router), 'navigate')
      .mockResolvedValue(true);

    query(fixture.debugElement, '.versus__swap').triggerEventHandler('clicked');

    expect(navigateSpy).toHaveBeenCalledWith(
      [],
      expect.objectContaining({ queryParams: { blue: 7, red: 2 } }),
    );
  });

  it("should show each chosen member's rating, linked to their profile", () => {
    compare('2', '7');

    createComponent();

    const names = queryAll(fixture.debugElement, '.contender__name');
    expect(names.map(name => name.attributes['href'])).toEqual([
      '/members/2',
      '/members/7',
    ]);
    expect(
      queryAll(fixture.debugElement, '.contender__rating-value').map(value =>
        value.nativeElement.textContent.trim(),
      ),
    ).toEqual(['1850', '1900', '1700/5', '1700/5']);
  });

  it("should fetch the pair's games and both members' results once", () => {
    compare('2', '7');
    const dispatchSpy = vi.spyOn(store, 'dispatch');

    createComponent();

    const fetches = [
      GamesActions.fetchHeadToHeadRequested({ firstNumber: 2, secondNumber: 7 }),
      TournamentsActions.fetchMemberTournamentsRequested({ memberNumber: 2 }),
      TournamentsActions.fetchMemberTournamentsRequested({ memberNumber: 7 }),
    ];
    for (const fetch of fetches) {
      expect(
        dispatchSpy.mock.calls.filter(([action]) => isEqual(action, fetch)),
      ).toHaveLength(1);
    }
  });

  it('should not fetch what the store already holds', () => {
    loaded();
    compare('2', '7');
    const dispatchSpy = vi.spyOn(store, 'dispatch');

    createComponent();

    expect(dispatchSpy).not.toHaveBeenCalled();
  });

  it('should show their results, games, ratings and shared tournaments', () => {
    loaded();
    compare('2', '7');

    createComponent();

    expect(query(fixture.debugElement, 'lcc-head-to-head-results')).toBeTruthy();
    expect(query(fixture.debugElement, 'lcc-head-to-head-games')).toBeTruthy();
    expect(
      query(fixture.debugElement, 'lcc-rating-comparison').componentInstance.members(),
    ).toEqual([
      { number: 2, name: 'John Doe', color: 'var(--lcc-head-to-head-first)' },
      { number: 7, name: 'Jane Smith', color: 'var(--lcc-head-to-head-second)' },
    ]);
    expect(query(fixture.debugElement, 'lcc-shared-tournaments')).toBeTruthy();
  });

  it('should say so when the members never played each other', () => {
    loaded([]);
    compare('2', '7');

    createComponent();

    expect(queryTextContent(fixture.debugElement, '.section__empty')).toBe(
      'These members have no recorded games against each other.',
    );
    expect(query(fixture.debugElement, 'lcc-head-to-head-results')).toBeFalsy();
  });

  it('should offer to load their games again when they fail to load', () => {
    setState({ failedLoads: ['head-to-head'] });
    compare('2', '7');
    createComponent();
    const dispatchSpy = vi.spyOn(store, 'dispatch');

    query(fixture.debugElement, 'lcc-load-failed').triggerEventHandler('retry');

    expect(dispatchSpy).toHaveBeenCalledWith(
      GamesActions.fetchHeadToHeadRequested({ firstNumber: 2, secondNumber: 7 }),
    );
  });

  it('should offer to load the members again when they fail to load', () => {
    profilesStatus.set('failed');
    createComponent();

    query(fixture.debugElement, 'lcc-load-failed').triggerEventHandler('retry');

    expect(memberProfiles.load).toHaveBeenCalledTimes(2);
    expect(query(fixture.debugElement, 'ea-dropdown')).toBeFalsy();
  });
});
