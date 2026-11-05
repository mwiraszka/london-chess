import { DebugElement } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { MOCK_MEMBER_TOURNAMENT_RESULTS } from '@app/mocks/tournaments.mock';
import { MemberTournamentResult } from '@app/models';
import { query, queryAll } from '@app/utils';

import { SharedTournamentsComponent } from './shared-tournaments.component';

describe('SharedTournamentsComponent', () => {
  let fixture: ComponentFixture<SharedTournamentsComponent>;

  const [championship, fallActive] = MOCK_MEMBER_TOURNAMENT_RESULTS;

  const textOf = (element: DebugElement): string =>
    element.nativeElement.textContent.replace(/\s+/g, ' ').trim();

  const bodyRows = () =>
    queryAll(fixture.debugElement, '.ea-data-table__body .ea-data-table__row');

  const render = (
    firstResults: MemberTournamentResult[],
    secondResults: MemberTournamentResult[],
  ) => {
    fixture.componentRef.setInput('firstResults', firstResults);
    fixture.componentRef.setInput('secondResults', secondResults);
    fixture.componentRef.setInput('names', { first: 'John Doe', second: 'Jane Smith' });
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SharedTournamentsComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(SharedTournamentsComponent);
  });

  it("should list the tournaments both played, newest first, with each member's finish", () => {
    render(
      [championship, fallActive],
      [
        { ...championship, rank: 2 },
        { ...fallActive, rank: 3, score: 1 },
      ],
    );

    expect(
      queryAll(fixture.debugElement, '.ea-data-table__cell--header').map(textOf),
    ).toEqual(['Date(s)', 'Tournament', 'John Doe', 'Jane Smith']);
    expect(
      bodyRows().map(row => queryAll(row, '.ea-data-table__cell').map(textOf)),
    ).toEqual([
      ['Sep 12 – Nov 14, 2024', 'Championship', '1 of 2, 3½', '2 of 2, 3½'],
      ['Oct 19, 2023', 'Fall Active', '1 of 3, 2½', '3 of 3, 1'],
    ]);
    expect(query(bodyRows()[0], '.shared__higher')).toBeTruthy();
  });

  it('should count how often each finished above the other', () => {
    render(
      [championship, fallActive],
      [
        { ...championship, rank: 2 },
        { ...fallActive, rank: 3 },
      ],
    );

    const donut = query(fixture.debugElement, 'ea-pie-chart').componentInstance;
    expect(donut.data()).toEqual([
      { label: 'John Doe', value: 2, color: 'var(--lcc-head-to-head-first)' },
      { label: 'Jane Smith', value: 0, color: 'var(--lcc-head-to-head-second)' },
    ]);
  });

  it('should leave out the count when no places compare', () => {
    render([championship], [{ ...championship, section: 'A2' }]);

    expect(query(fixture.debugElement, 'ea-pie-chart')).toBeFalsy();
    expect(bodyRows()).toHaveLength(1);
  });

  it('should open each tournament', () => {
    render([fallActive], [fallActive]);
    const navigateSpy = vi
      .spyOn(TestBed.inject(Router), 'navigate')
      .mockResolvedValue(true);

    bodyRows()[0].triggerEventHandler('click');

    expect(navigateSpy).toHaveBeenCalledWith(['/tournaments', 90]);
  });
});
