import { RoundResult } from '../models/tournament.model';
import { performanceRating, performanceRatings } from './performance-rating.util';

const game = (
  round: number,
  opponentRank: number | null,
  scores: number[],
  outcome: RoundResult['outcome'] = 'game',
): RoundResult => ({
  round,
  outcome,
  scores,
  points: scores.reduce((total, score) => total + score, 0),
  opponentRank,
  color: null,
});

describe('performanceRating', () => {
  it('should add 400 per net win to the average opponent rating', () => {
    expect(
      performanceRating([
        { opponentRating: 1500, score: 1 },
        { opponentRating: 1700, score: 0.5 },
        { opponentRating: 1600, score: 1 },
      ]),
    ).toBe(1867);
  });

  it('should have no rating without rated games', () => {
    expect(performanceRating([])).toBeNull();
  });
});

describe('performanceRatings', () => {
  it('should rate crosstable entries from their rated games only', () => {
    const ratings = performanceRatings(
      [
        {
          rank: 1,
          rating: 1600,
          score: 2.5,
          rounds: [
            game(1, 2, [1]),
            game(2, 3, [1]),
            game(3, null, [], 'half-point-bye'),
            game(4, 2, [1], 'forfeit'),
          ],
        },
        { rank: 2, rating: 1400, score: 0, rounds: [game(1, 1, [0])] },
        { rank: 3, rating: null, score: 0, rounds: [game(2, 1, [0])] },
        { rank: 4, rating: 1500, score: 0.5, rounds: [game(1, null, [], 'unplayed')] },
      ],
      false,
      1,
    );

    expect(ratings).toEqual([1800, 1200, 1200, null]);
  });

  it('should rate every game of a double round', () => {
    const ratings = performanceRatings(
      [
        { rank: 1, rating: 1600, score: 1.5, rounds: [game(1, 2, [1, 0.5])] },
        { rank: 2, rating: 1400, score: 0.5, rounds: [game(1, 1, [0, 0.5])] },
      ],
      false,
      2,
    );

    expect(ratings).toEqual([1600, 1400]);
  });

  it('should rate standings-only round robins from the score against rated, finished opponents', () => {
    const complete = performanceRatings(
      [
        { rank: 1, rating: 1600, score: 2, rounds: [] },
        { rank: 2, rating: 1500, score: 1, rounds: [] },
        { rank: 3, rating: 1400, score: 0, rounds: [] },
      ],
      true,
      1,
    );
    const withUnrated = performanceRatings(
      [
        { rank: 1, rating: 1600, score: 1, rounds: [] },
        { rank: 2, rating: null, score: 0, rounds: [] },
      ],
      true,
      1,
    );
    const swiss = performanceRatings(
      [
        { rank: 1, rating: 1600, score: 1, rounds: [] },
        { rank: 2, rating: 1500, score: 0, rounds: [] },
      ],
      false,
      1,
    );
    const alone = performanceRatings(
      [{ rank: 1, rating: 1600, score: 0, rounds: [] }],
      true,
      1,
    );

    expect(complete).toEqual([1850, 1500, 1150]);
    expect(withUnrated).toEqual([null, 1200]);
    expect(swiss).toEqual([null, null]);
    expect(alone).toEqual([null]);
  });
});
