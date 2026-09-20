import { MockStore, provideMockStore } from '@ngrx/store/testing';

import { DebugElement } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { TOURNAMENT_SIZING } from '@app/constants/tournament-sizing';
import { MOCK_MEMBER_TOURNAMENT_RESULTS } from '@app/mocks/tournaments.mock';
import { MemberTournamentResult } from '@app/models';
import { TournamentsActions, initialState } from '@app/store/tournaments';
import { query, queryAll } from '@app/utils';

import { MemberTournamentsComponent, ResultRow } from './member-tournaments.component';

describe('MemberTournamentsComponent', () => {
  let fixture: ComponentFixture<MemberTournamentsComponent>;
  let store: MockStore;

  let dispatchSpy: MockInstance;

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

  const textOf = (element: DebugElement): string =>
    element.nativeElement.textContent.replace(/\s+/g, ' ').trim();

  const bodyRows = () =>
    queryAll(fixture.debugElement, '.ea-data-table__body .ea-data-table__row');

  const render = (memberNumber: number) => {
    fixture.componentRef.setInput('memberNumber', memberNumber);
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MemberTournamentsComponent],
      providers: [
        provideMockStore({
          initialState: stateWith({ 2: MOCK_MEMBER_TOURNAMENT_RESULTS }),
        }),
        provideRouter([]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MemberTournamentsComponent);
    store = TestBed.inject(MockStore);

    dispatchSpy = vi.spyOn(store, 'dispatch');
  });

  describe("with the member's results in the store", () => {
    beforeEach(() => render(2));

    it('should not fetch them again', () => {
      expect(dispatchSpy).not.toHaveBeenCalled();
    });

    it('should list each tournament with its days, place, score and rating', () => {
      expect(
        bodyRows().map(row => queryAll(row, '.ea-data-table__cell').map(textOf)),
      ).toEqual([
        ['September 12 – November 14, 2024', 'Championship (A1)', '1 of 2', '3½', '1850'],
        ['October 19, 2023', 'Fall Active', '1 of 3', '2½', '1850'],
      ]);
    });

    it('should line the dates up on the right', () => {
      const [dateHeader] = queryAll(fixture.debugElement, '.ea-data-table__cell--header');

      expect(textOf(dateHeader)).toBe('Date(s)');
      expect(dateHeader.classes['ea-data-table__cell--align-right']).toBe(true);
    });

    it('should size the columns by the widest content for any member', () => {
      const sizingRows: ResultRow[] = query(
        fixture.debugElement,
        'ea-data-table',
      ).componentInstance.sizingRows();

      expect(sizingRows[0].date).toBe('September 30 – November 30, 2000');
      expect(sizingRows[0].place).toBe(
        `${TOURNAMENT_SIZING.maxSectionPlayers} of ${TOURNAMENT_SIZING.maxSectionPlayers}`,
      );
      expect(sizingRows[0].rating).toBe(TOURNAMENT_SIZING.maxRating);
      expect(
        queryAll(fixture.debugElement, '.ea-data-table__sizing .ea-data-table__row'),
      ).toHaveLength(sizingRows.length);
    });

    it('should link each row to its tournament', () => {
      const navigateSpy = vi
        .spyOn(TestBed.inject(Router), 'navigate')
        .mockResolvedValue(true);

      bodyRows()[1].triggerEventHandler('click');

      expect(query(bodyRows()[0], 'a.ea-data-table__row-link').attributes['href']).toBe(
        '/tournaments/118',
      );
      expect(navigateSpy).toHaveBeenCalledWith(['/tournaments', 90]);
    });

    it('should not page a short list', () => {
      expect(query(fixture.debugElement, 'ea-paginator')).toBeFalsy();
    });
  });

  it('should show a simul board and its result in place of a place and score', () => {
    store.setState(
      stateWith({
        7: [
          {
            ...MOCK_MEMBER_TOURNAMENT_RESULTS[0],
            tournament: {
              ...MOCK_MEMBER_TOURNAMENT_RESULTS[0].tournament,
              name: 'Tandem Simul',
              endDate: null,
              format: 'tandem-simul',
            },
            section: '',
            rank: 4,
            rating: null,
            score: null,
            resultNote: 'Draw',
          },
        ],
      }),
    );

    render(7);

    expect(queryAll(bodyRows()[0], '.ea-data-table__cell').map(textOf)).toEqual([
      'September 12, 2024',
      'Tandem Simul',
      'Board 4',
      'Draw',
      'Unrated',
    ]);
  });

  it('should page a long list', () => {
    store.setState(
      stateWith({
        2: Array.from({ length: 12 }, () => MOCK_MEMBER_TOURNAMENT_RESULTS[1]),
      }),
    );

    render(2);

    expect(bodyRows()).toHaveLength(10);
    expect(query(fixture.debugElement, 'ea-paginator')).toBeTruthy();
  });

  it('should say when a member has no tournaments on record', () => {
    store.setState(stateWith({ 2: [] }));

    render(2);

    expect(textOf(query(fixture.debugElement, '.ea-data-table__body'))).toBe(
      'No tournaments on record yet.',
    );
  });

  describe("without the member's results", () => {
    beforeEach(() => {
      store.setState(stateWith({}));
      render(2);
    });

    it('should fetch them', () => {
      expect(dispatchSpy).toHaveBeenCalledWith(
        TournamentsActions.fetchMemberTournamentsRequested({ memberNumber: 2 }),
      );
    });

    it('should hold the table with skeleton rows', () => {
      expect(bodyRows()).toHaveLength(3);
      expect(queryAll(bodyRows()[0], 'lcc-text-skeleton')).toHaveLength(5);
    });

    it('should not open skeleton rows', () => {
      const navigateSpy = vi
        .spyOn(TestBed.inject(Router), 'navigate')
        .mockResolvedValue(true);

      bodyRows()[0].triggerEventHandler('click');

      expect(navigateSpy).not.toHaveBeenCalled();
    });
  });

  it('should offer to try again when the results fail to load', () => {
    store.setState(stateWith({}, true));
    render(2);
    dispatchSpy.mockClear();

    query(fixture.debugElement, 'lcc-load-failed').triggerEventHandler('retry');

    expect(dispatchSpy).toHaveBeenCalledWith(
      TournamentsActions.fetchMemberTournamentsRequested({ memberNumber: 2 }),
    );
  });
});
