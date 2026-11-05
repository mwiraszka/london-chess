import { MOCK_MEMBER_TOURNAMENT_RESULTS } from '@app/mocks/tournaments.mock';

import {
  formatRating,
  quarterlyTicks,
  ratedResults,
  ratedTournamentLabel,
  tournamentTime,
} from './rating-progression.util';

describe('rating progression utils', () => {
  const [championship, fallActive] = MOCK_MEMBER_TOURNAMENT_RESULTS;

  it('should keep one rated result a tournament, oldest first', () => {
    const results = [
      championship,
      { ...championship, section: 'Final', rating: 1900 },
      fallActive,
      {
        ...fallActive,
        tournament: { ...fallActive.tournament, number: 91, isRated: false },
      },
    ];

    const rated = ratedResults(results);

    expect(rated).toEqual([fallActive, championship]);
  });

  it('should name a tournament with its date', () => {
    expect(ratedTournamentLabel(championship.tournament)).toBe(
      'Championship (Sep 12, 2024)',
    );
  });

  it('should tick the first month of every quarter the tournaments span', () => {
    const ticks = quarterlyTicks([
      tournamentTime('2023-11-20'),
      tournamentTime('2024-04-02'),
    ]);

    expect(ticks.map(({ label }) => label)).toEqual(['Oct 2023', 'Jan 2024', 'Apr 2024']);
  });

  it('should tick nothing without tournaments', () => {
    expect(quarterlyTicks([])).toEqual([]);
  });

  it('should write a rating as a whole number without separators', () => {
    expect(formatRating(1999.6)).toBe('2000');
  });
});
