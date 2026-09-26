import { MOCK_MEMBER_TOURNAMENT_RESULTS } from '@app/mocks/tournaments.mock';
import { MemberTournamentResult, Tournament } from '@app/models';

import { trophyForResult, trophyShapeFor } from './trophies.util';

describe('trophies util', () => {
  const tournament = (
    overrides: Partial<Pick<Tournament, 'name' | 'format' | 'timeControl'>>,
  ): Pick<Tournament, 'name' | 'format' | 'timeControl'> => ({
    name: 'Blitz',
    format: 'swiss',
    timeControl: 'G5+3',
    ...overrides,
  });

  const result = (
    rank: number,
    overrides: Partial<Pick<Tournament, 'name' | 'format' | 'timeControl'>> = {},
  ): MemberTournamentResult => ({
    ...MOCK_MEMBER_TOURNAMENT_RESULTS[1],
    tournament: { ...MOCK_MEMBER_TOURNAMENT_RESULTS[1].tournament, ...overrides },
    rank,
  });

  describe('trophyShapeFor', () => {
    it('should give a simul no trophy', () => {
      expect(trophyShapeFor(tournament({ format: 'tandem-simul' }))).toBeNull();
    });

    it('should give a match no trophy', () => {
      expect(
        trophyShapeFor(tournament({ name: 'COVID-19 Match', format: 'match' })),
      ).toBeNull();
    });

    it('should give a championship the bowl', () => {
      expect(
        trophyShapeFor(tournament({ name: 'Championship', timeControl: 'G80' })),
      ).toBe('bowl');
      expect(
        trophyShapeFor(
          tournament({ name: 'London Junior Chess Championship', timeControl: 'G25' }),
        ),
      ).toBe('bowl');
    });

    it('should not give a championship qualifier the bowl', () => {
      expect(
        trophyShapeFor(
          tournament({ name: 'Championship Qualifier', timeControl: 'G25' }),
        ),
      ).toBe('cup');
    });

    it('should give blitz the chalice', () => {
      expect(trophyShapeFor(tournament({ timeControl: 'G5+3' }))).toBe('chalice');
      expect(trophyShapeFor(tournament({ timeControl: 'G10' }))).toBe('chalice');
      expect(trophyShapeFor(tournament({ timeControl: 'G10+5' }))).toBe('chalice');
    });

    it('should give every longer time control the cup', () => {
      expect(
        trophyShapeFor(tournament({ name: 'Fall Active', timeControl: 'G25' })),
      ).toBe('cup');
      expect(
        trophyShapeFor(tournament({ name: 'Memorial', timeControl: 'G90+30' })),
      ).toBe('cup');
      expect(trophyShapeFor(tournament({ name: 'Match', timeControl: '3 hours' }))).toBe(
        'cup',
      );
    });
  });

  describe('trophyForResult', () => {
    it('should award gold, silver and bronze to the first three places', () => {
      expect(trophyForResult(result(1, { timeControl: 'G5+3' }))).toEqual({
        file: 'trophy-chalice-gold.svg',
        label: 'Gold chalice trophy',
        shape: 'chalice',
        metal: 'gold',
      });
      expect(trophyForResult(result(2))?.file).toBe('trophy-cup-silver.svg');
      expect(trophyForResult(result(3))?.file).toBe('trophy-cup-bronze.svg');
    });

    it('should award nothing below third place', () => {
      expect(trophyForResult(result(4))).toBeNull();
    });

    it('should award nothing for a simul board', () => {
      expect(trophyForResult(result(1, { format: 'tandem-simul' }))).toBeNull();
    });

    it('should award the champion the bowl and the runners-up cups', () => {
      const championship = { name: 'Championship', timeControl: 'G80' };

      expect(trophyForResult(result(1, championship))).toEqual({
        file: 'trophy-bowl.svg',
        label: 'Gold bowl trophy with blue and red tassels',
        shape: 'bowl',
        metal: 'gold',
      });
      expect(trophyForResult(result(2, championship))?.file).toBe(
        'trophy-cup-silver.svg',
      );
      expect(trophyForResult(result(3, championship))?.file).toBe(
        'trophy-cup-bronze.svg',
      );
    });
  });
});
