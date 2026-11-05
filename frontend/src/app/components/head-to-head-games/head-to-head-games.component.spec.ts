import { DebugElement } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { MOCK_HEAD_TO_HEAD_GAMES } from '@app/mocks/games.mock';
import { HeadToHeadGame } from '@app/models';
import { query, queryAll } from '@app/utils';

import { HeadToHeadGamesComponent } from './head-to-head-games.component';

describe('HeadToHeadGamesComponent', () => {
  let fixture: ComponentFixture<HeadToHeadGamesComponent>;

  const textOf = (element: DebugElement): string =>
    element.nativeElement.textContent.replace(/\s+/g, ' ').trim();

  const bodyRows = () =>
    queryAll(fixture.debugElement, '.ea-data-table__body .ea-data-table__row');

  const render = (games: HeadToHeadGame[] = MOCK_HEAD_TO_HEAD_GAMES) => {
    fixture.componentRef.setInput('games', games);
    fixture.componentRef.setInput('names', { first: 'John Doe', second: 'Jane Smith' });
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HeadToHeadGamesComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(HeadToHeadGamesComponent);
  });

  it('should list each game, newest first, with who had White and who won', () => {
    render();

    expect(
      bodyRows().map(row => queryAll(row, '.ea-data-table__cell').map(textOf)),
    ).toEqual([
      ['Oct 3, 2024', 'Championship (A1)', '2', 'John Doe', 'John Doe won'],
      ['Sep 12, 2024', 'Championship (A1)', '1', 'Jane Smith', 'Drawn'],
      ['Oct 19, 2023', 'Fall Active', '3', 'Jane Smith', 'Jane Smith won'],
      ['2021', 'Club Championship (A)', '4.2', 'Not recorded', 'John Doe won'],
    ]);
  });

  it("should mark each result in the winner's colour", () => {
    render();

    expect(
      bodyRows().map(row => {
        const { classes } = query(row, '.games__swatch');
        return classes['games__swatch--first']
          ? 'first'
          : classes['games__swatch--second']
            ? 'second'
            : 'draw';
      }),
    ).toEqual(['first', 'draw', 'second', 'first']);
  });

  it('should open a game in the archives, or its tournament when its moves were not kept', () => {
    render();
    const navigateSpy = vi
      .spyOn(TestBed.inject(Router), 'navigateByUrl')
      .mockResolvedValue(true);

    bodyRows()[1].triggerEventHandler('click');

    expect(query(bodyRows()[0], 'a.ea-data-table__row-link').attributes['href']).toBe(
      '/game-archives/6a0000000000000000000001',
    );
    expect(navigateSpy).toHaveBeenCalledWith('/tournaments/118');
  });

  it('should page a long list of games', () => {
    render(
      Array.from({ length: 12 }, (_, index) => ({
        ...MOCK_HEAD_TO_HEAD_GAMES[0],
        round: String(index + 1),
      })),
    );

    expect(query(fixture.debugElement, 'ea-paginator')).toBeTruthy();
    expect(bodyRows()).toHaveLength(10);
  });
});
