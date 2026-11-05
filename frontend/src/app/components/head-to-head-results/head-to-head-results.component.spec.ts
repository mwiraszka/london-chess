import { ChartSeries } from '@eagami/ui';

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MOCK_HEAD_TO_HEAD_GAMES } from '@app/mocks/games.mock';
import { HeadToHeadGame } from '@app/models';
import { query, queryAll, queryTextContent } from '@app/utils';

import { HeadToHeadResultsComponent } from './head-to-head-results.component';

describe('HeadToHeadResultsComponent', () => {
  let fixture: ComponentFixture<HeadToHeadResultsComponent>;

  const render = (games: HeadToHeadGame[] = MOCK_HEAD_TO_HEAD_GAMES) => {
    fixture.componentRef.setInput('games', games);
    fixture.componentRef.setInput('names', { first: 'John Doe', second: 'Jane Smith' });
    fixture.detectChanges();
  };

  const charts = (selector: string) =>
    queryAll(fixture.debugElement, selector).map(chart => chart.componentInstance);

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HeadToHeadResultsComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(HeadToHeadResultsComponent);
  });

  it("should show each member's points and read the score out in a sentence", () => {
    render();

    expect(
      queryAll(fixture.debugElement, '.score__points').map(points =>
        points.nativeElement.textContent.trim(),
      ),
    ).toEqual(['2½', '1½']);
    expect(queryTextContent(fixture.debugElement, '.lcc-visually-hidden')).toBe(
      'John Doe has scored 2½ and Jane Smith 1½ in 4 games against each other.',
    );
  });

  it("should split the games into each member's wins and the draws, in the members' colours", () => {
    render();

    const [donut] = charts('ea-pie-chart');
    expect(donut.data()).toEqual([
      { label: 'John Doe won', value: 2, color: 'var(--lcc-head-to-head-first)' },
      { label: 'Drawn', value: 1, color: 'var(--lcc-head-to-head-draw)' },
      { label: 'Jane Smith won', value: 1, color: 'var(--lcc-head-to-head-second)' },
    ]);
  });

  it('should chart the results by colour and the points by year', () => {
    render();

    const [byColor, byYear] = charts('ea-bar-chart');
    expect(byColor.labels()).toEqual(['As White', 'As Black']);
    expect(
      queryAll(fixture.debugElement, '.chart__title')[1].nativeElement.textContent,
    ).toBe("By John Doe's colour");
    expect(byColor.series().map((series: ChartSeries) => series.data)).toEqual([
      [1, 0],
      [0, 1],
      [0, 1],
    ]);
    expect(byYear.labels()).toEqual(['2021', '2022', '2023', '2024']);
    expect(byYear.series().map((series: ChartSeries) => series.data)).toEqual([
      [1, 0, 0, 1.5],
      [0, 0, 1, 0.5],
    ]);
  });

  it('should leave out the charts with nothing to show', () => {
    render([{ ...MOCK_HEAD_TO_HEAD_GAMES[3] }]);

    expect(charts('ea-bar-chart')).toHaveLength(0);
    expect(query(fixture.debugElement, 'ea-pie-chart')).toBeTruthy();
  });
});
