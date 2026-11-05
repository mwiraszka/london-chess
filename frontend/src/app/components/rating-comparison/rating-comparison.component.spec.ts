import { MockStore, provideMockStore } from '@ngrx/store/testing';

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MOCK_MEMBER_TOURNAMENT_RESULTS } from '@app/mocks/tournaments.mock';
import { ChartedMember, MemberTournamentResult } from '@app/models';
import { TournamentsActions, initialState } from '@app/store/tournaments';
import { query } from '@app/utils';

import { RatingComparisonComponent } from './rating-comparison.component';

describe('RatingComparisonComponent', () => {
  let fixture: ComponentFixture<RatingComparisonComponent>;
  let store: MockStore;

  const [championship, fallActive] = MOCK_MEMBER_TOURNAMENT_RESULTS;

  const MEMBERS: ChartedMember[] = [
    { number: 2, name: 'John Doe', color: 'var(--lcc-head-to-head-first)' },
    { number: 7, name: 'Jane Smith', color: 'var(--lcc-head-to-head-second)' },
  ];

  const stateWith = (
    memberResults: Record<number, MemberTournamentResult[]>,
    failed = false,
  ) => ({
    tournamentsState: {
      ...initialState,
      memberResults,
      failedLoads: failed ? ['member-results' as const] : [],
    },
  });

  const render = () => {
    fixture.componentRef.setInput('members', MEMBERS);
    fixture.detectChanges();
  };

  const chart = () => query(fixture.debugElement, 'ea-line-chart')?.componentInstance;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RatingComparisonComponent],
      providers: [provideMockStore({ initialState: stateWith({}) })],
    }).compileComponents();

    fixture = TestBed.createComponent(RatingComparisonComponent);
    store = TestBed.inject(MockStore);
  });

  it("should plot each member's line in their colour, carried across the tournaments only the other played", () => {
    store.setState(
      stateWith({
        2: [
          { ...championship, rating: 1880 },
          { ...fallActive, rating: 1810 },
        ],
        7: [{ ...championship, rating: 1700 }],
      }),
    );

    render();

    expect(chart().labels()).toEqual([
      'Fall Active (Oct 19, 2023)',
      'Championship (Sep 12, 2024)',
    ]);
    expect(chart().series()).toEqual([
      { name: 'John Doe', color: MEMBERS[0].color, data: [1810, 1880] },
      { name: 'Jane Smith', color: MEMBERS[1].color, data: [null, 1700] },
    ]);
    expect(chart().connectGaps()).toBe(true);
    expect(chart().showLegend()).toBe(true);
  });

  it('should span every rating the club sees around a lone rating', () => {
    store.setState(stateWith({ 2: [championship], 7: [] }));

    render();

    expect([chart().yMin(), chart().yMax()]).toEqual([0, 2500]);
  });

  it('should hold a placeholder until both members have loaded', () => {
    store.setState(stateWith({ 2: [championship] }));

    render();

    expect(query(fixture.debugElement, 'ea-skeleton')).toBeTruthy();
    expect(chart()).toBeUndefined();
  });

  it('should load again only the members that failed to load', () => {
    store.setState(stateWith({ 2: [championship] }, true));
    render();
    const dispatchSpy = vi.spyOn(store, 'dispatch');

    query(fixture.debugElement, 'lcc-load-failed').triggerEventHandler('retry');

    expect(dispatchSpy).toHaveBeenCalledExactlyOnceWith(
      TournamentsActions.fetchMemberTournamentsRequested({ memberNumber: 7 }),
    );
  });
});
