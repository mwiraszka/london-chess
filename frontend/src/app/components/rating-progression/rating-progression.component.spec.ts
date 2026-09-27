import { MockStore, provideMockStore } from '@ngrx/store/testing';

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MOCK_MEMBER_TOURNAMENT_RESULTS } from '@app/mocks/tournaments.mock';
import { MemberTournamentResult } from '@app/models';
import { TournamentsActions, initialState } from '@app/store/tournaments';
import { query, queryTextContent } from '@app/utils';

import { RatingProgressionComponent } from './rating-progression.component';

describe('RatingProgressionComponent', () => {
  let fixture: ComponentFixture<RatingProgressionComponent>;
  let store: MockStore;

  const [championship, fallActive] = MOCK_MEMBER_TOURNAMENT_RESULTS;

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
    fixture.componentRef.setInput('memberNumber', 2);
    fixture.detectChanges();
  };

  const chart = () => query(fixture.debugElement, 'ea-line-chart')?.componentInstance;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RatingProgressionComponent],
      providers: [provideMockStore({ initialState: stateWith({}) })],
    }).compileComponents();

    fixture = TestBed.createComponent(RatingProgressionComponent);
    store = TestBed.inject(MockStore);
  });

  it('should plot the rating at each rated tournament, oldest first', () => {
    store.setState(
      stateWith({
        2: [
          { ...championship, rating: 1880 },
          { ...fallActive, rating: 1810 },
          { ...fallActive, rating: null },
        ],
      }),
    );

    render();

    expect(chart().labels()).toEqual([
      'Fall Active (Oct 19, 2023)',
      'Championship (Sep 12, 2024)',
    ]);
    expect(chart().formatValue()(1877.4)).toBe('1877');
    expect(chart().series()).toEqual([{ name: 'Rating at start', data: [1810, 1880] }]);
    expect(chart().showLegend()).toBe(false);
    expect(chart().animation()).toBe('draw');
    expect(chart().animationDuration()).toBe(3000);
    expect(chart().curve()).toBe('smooth');
    expect(chart().showAxisBreak()).toBe(true);
    expect(chart().xLabelOrientation()).toBe('auto');
  });

  it('should place each tournament at its date, with a tick every quarter', () => {
    store.setState(stateWith({ 2: [championship, fallActive] }));

    render();

    expect(chart().xValues()).toEqual([
      new Date(2023, 9, 19).getTime(),
      new Date(2024, 8, 12).getTime(),
    ]);
    expect(
      chart()
        .xTicks()
        .map((tick: { label: string }) => tick.label),
    ).toEqual(['Oct 2023', 'Jan 2024', 'Apr 2024', 'Jul 2024']);
    expect(chart().visibleXSpan()).toBeGreaterThan(4.9 * 365 * 24 * 60 * 60 * 1000);
  });

  it('should leave out unrated tournaments', () => {
    store.setState(
      stateWith({
        2: [
          championship,
          fallActive,
          {
            ...fallActive,
            tournament: { ...fallActive.tournament, number: 91, isRated: false },
          },
        ],
      }),
    );

    render();

    expect(chart().series()[0].data).toHaveLength(2);
  });

  it('should keep only the section a member played most of a tournament in', () => {
    store.setState(
      stateWith({
        2: [
          championship,
          { ...fallActive, section: 'A', roundsPlayed: 1, rating: 1700 },
          { ...fallActive, section: 'B', roundsPlayed: 2, rating: 1810 },
        ],
      }),
    );

    render();

    expect(chart().series()[0].data).toEqual([1810, championship.rating]);
  });

  it('should explain the missing graph until two rated tournaments are on record', () => {
    store.setState(stateWith({ 2: [{ ...championship, rating: 1880 }] }));

    render();

    expect(chart()).toBeUndefined();
    expect(queryTextContent(fixture.debugElement, '.rating-progression__empty')).toBe(
      'Rating progression shows once a member has played two rated tournaments.',
    );
  });

  it('should hold the height of the graph in every state', () => {
    render();
    const loadingHeight = fixture.nativeElement.style.height;
    store.setState(stateWith({ 2: [championship, fallActive] }));
    fixture.detectChanges();
    const chartHeight = fixture.nativeElement.style.height;
    store.setState(stateWith({ 2: [] }));
    fixture.detectChanges();

    expect([loadingHeight, chartHeight, fixture.nativeElement.style.height]).toEqual([
      '240px',
      '240px',
      '240px',
    ]);
  });

  it('should hold a placeholder in place of the graph while the results load', () => {
    render();

    expect(query(fixture.debugElement, '.rating-progression__skeleton')).toBeTruthy();
  });

  it('should offer to try again when the results fail to load', () => {
    store.setState(stateWith({}, true));
    render();
    const dispatchSpy = vi.spyOn(store, 'dispatch');

    query(fixture.debugElement, 'lcc-load-failed').triggerEventHandler('retry');

    expect(dispatchSpy).toHaveBeenCalledWith(
      TournamentsActions.fetchMemberTournamentsRequested({ memberNumber: 2 }),
    );
  });
});
