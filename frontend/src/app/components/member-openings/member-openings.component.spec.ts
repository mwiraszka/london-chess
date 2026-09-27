import { MockStore, provideMockStore } from '@ngrx/store/testing';

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MemberOpenings, OpeningCount } from '@app/models';
import { GamesActions, initialState } from '@app/store/games';
import { query, queryAll, queryTextContent } from '@app/utils';

import { MemberOpeningsComponent } from './member-openings.component';

describe('MemberOpeningsComponent', () => {
  let fixture: ComponentFixture<MemberOpeningsComponent>;
  let store: MockStore;

  const counts = (...entries: [string, number][]): OpeningCount[] =>
    entries.map(([opening, gameCount]) => ({ opening, gameCount }));

  const show = (openings: MemberOpenings | null, failed = false) => {
    store.setState({
      gamesState: {
        ...initialState,
        memberOpenings: openings ? { 7: openings } : {},
        failedLoads: failed ? ['member-openings' as const] : [],
      },
    });
    fixture.componentRef.setInput('memberNumber', 7);
    fixture.detectChanges();
  };

  const charts = () =>
    queryAll(fixture.debugElement, 'ea-pie-chart').map(chart => chart.componentInstance);

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MemberOpeningsComponent],
      providers: [provideMockStore({ initialState: { gamesState: initialState } })],
    }).compileComponents();

    fixture = TestBed.createComponent(MemberOpeningsComponent);
    store = TestBed.inject(MockStore);
  });

  it('should hold a placeholder for each colour while the openings load', () => {
    show(null);

    expect(queryAll(fixture.debugElement, '.openings__skeleton')).toHaveLength(2);
  });

  it('should chart the openings played as White and as Black, with percentages', () => {
    show({
      white: counts(['Italian Game', 3], ['Ruy Lopez', 1]),
      black: counts(['Sicilian Defence', 2]),
    });

    expect(
      queryAll(fixture.debugElement, '.openings__heading').map(h =>
        h.nativeElement.textContent.trim(),
      ),
    ).toEqual(['As White', 'As Black']);
    expect(charts().map(chart => chart.data())).toEqual([
      [
        { label: 'Italian Game', value: 3 },
        { label: 'Ruy Lopez', value: 1 },
      ],
      [{ label: 'Sicilian Defence', value: 2 }],
    ]);
    charts().forEach(chart => {
      expect(chart.variant()).toBe('donut');
      expect(chart.showPercentages()).toBe(true);
      expect(chart.animationDuration()).toBe(3000);
    });
    expect(charts()[0].formatValue()(1)).toBe('1 game');
    expect(charts()[0].formatValue()(4)).toBe('4 games');
  });

  it('should fold every opening past the fifth into Other', () => {
    show({
      white: counts(['A', 9], ['B', 8], ['C', 7], ['D', 6], ['E', 5], ['F', 2], ['G', 1]),
      black: [],
    });

    expect(
      charts()[0]
        .data()
        .map((slice: { label: string }) => slice.label),
    ).toEqual(['A', 'B', 'C', 'D', 'E', 'Other']);
    expect(charts()[0].data().at(-1).value).toBe(3);
  });

  it('should explain a colour with no games', () => {
    show({ white: counts(['Italian Game', 3]), black: [] });

    expect(charts()).toHaveLength(1);
    expect(queryTextContent(fixture.debugElement, '.openings__empty')).toBe(
      'No games as Black in the archives yet.',
    );
  });

  it('should explain when the member has no archived games at all', () => {
    show({ white: [], black: [] });

    expect(query(fixture.debugElement, '.openings')).toBeFalsy();
    expect(queryTextContent(fixture.debugElement, '.openings__empty')).toBe(
      'Openings show once a member has games in the archives.',
    );
  });

  it('should offer to try again when the openings fail to load', () => {
    show(null, true);
    const dispatchSpy = vi.spyOn(store, 'dispatch');

    query(fixture.debugElement, 'lcc-load-failed').triggerEventHandler('retry');

    expect(dispatchSpy).toHaveBeenCalledWith(
      GamesActions.fetchMemberOpeningsRequested({ memberNumber: 7 }),
    );
  });
});
