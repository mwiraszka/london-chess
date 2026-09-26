import { DebugElement } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { MOCK_MEMBER_TOURNAMENT_RESULTS } from '@app/mocks/tournaments.mock';
import { MemberTournamentResult } from '@app/models';
import { query, queryAll } from '@app/utils';

import { MemberHighlightsComponent } from './member-highlights.component';

describe('MemberHighlightsComponent', () => {
  let fixture: ComponentFixture<MemberHighlightsComponent>;

  const textOf = (element: DebugElement): string =>
    element.nativeElement.textContent.replace(/\s+/g, ' ').trim();

  const trophies = () => queryAll(fixture.debugElement, '.trophy');

  const render = (results: MemberTournamentResult[]) => {
    fixture.componentRef.setInput('results', results);
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MemberHighlightsComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(MemberHighlightsComponent);
  });

  describe('with podium finishes', () => {
    beforeEach(() => render(MOCK_MEMBER_TOURNAMENT_RESULTS));

    it('should close the section with a divider', () => {
      expect(query(fixture.debugElement, '.highlights__divider')).toBeTruthy();
    });

    it('should stand a trophy for each finish, newest first', () => {
      expect(trophies().map(trophy => query(trophy, 'img').attributes['src'])).toEqual([
        'assets/trophy-bowl.svg',
        'assets/trophy-cup-gold.svg',
      ]);
      expect(trophies().map(trophy => trophy.attributes['aria-label'])).toEqual([
        'Gold bowl trophy with blue and red tassels: 1st of 2 in Championship (A1), September 12 – November 14, 2024',
        'Gold cup trophy: 1st of 3 in Fall Active, October 19, 2023',
      ]);
    });

    it('should start with the newest trophy selected', () => {
      expect(trophies().map(trophy => !!trophy.classes['trophy--selected'])).toEqual([
        true,
        false,
      ]);
      expect(textOf(query(fixture.debugElement, '.details__heading'))).toBe(
        '1st of 2 in Championship (A1)',
      );
    });

    it('should light up a selected trophy and show its tournament below', () => {
      trophies()[1].triggerEventHandler('click');
      fixture.detectChanges();

      expect(trophies()[1].classes['trophy--selected']).toBe(true);
      expect(trophies()[1].attributes['aria-pressed']).toBe('true');
      expect(trophies()[0].classes['trophy--selected']).toBeFalsy();
      expect(textOf(query(fixture.debugElement, '.details__heading'))).toBe(
        '1st of 3 in Fall Active',
      );
      expect(query(fixture.debugElement, '.details__link').attributes['href']).toBe(
        '/tournaments/90',
      );
      expect(queryAll(fixture.debugElement, '.fact__value').map(textOf)).toEqual([
        'October 19, 2023',
        'Swiss',
        'G25',
        '2½ / 3',
      ]);
    });

    it('should move the light to the next trophy selected', () => {
      trophies()[1].triggerEventHandler('click');
      fixture.detectChanges();

      trophies()[0].triggerEventHandler('click');
      fixture.detectChanges();

      expect(trophies().map(trophy => !!trophy.classes['trophy--selected'])).toEqual([
        true,
        false,
      ]);
      expect(textOf(query(fixture.debugElement, '.details__heading'))).toBe(
        '1st of 2 in Championship (A1)',
      );
    });

    it('should keep a trophy selected when it is clicked again', () => {
      trophies()[1].triggerEventHandler('click');
      fixture.detectChanges();

      trophies()[1].triggerEventHandler('click');
      fixture.detectChanges();

      expect(trophies()[1].classes['trophy--selected']).toBe(true);
    });

    it("should open another member's trophies with the newest selected", () => {
      trophies()[1].triggerEventHandler('click');
      fixture.detectChanges();

      render([MOCK_MEMBER_TOURNAMENT_RESULTS[1]]);

      expect(trophies()).toHaveLength(1);
      expect(trophies()[0].classes['trophy--selected']).toBe(true);
      expect(textOf(query(fixture.debugElement, '.details__heading'))).toBe(
        '1st of 3 in Fall Active',
      );
    });
  });

  it('should render nothing for a member without a podium finish', () => {
    render([{ ...MOCK_MEMBER_TOURNAMENT_RESULTS[1], rank: 4 }]);

    expect(query(fixture.debugElement, '.highlights')).toBeFalsy();
    expect(query(fixture.debugElement, '.highlights__divider')).toBeFalsy();
  });

  it('should render nothing while there are no results', () => {
    render([]);

    expect(fixture.nativeElement.textContent.trim()).toBe('');
  });
});
