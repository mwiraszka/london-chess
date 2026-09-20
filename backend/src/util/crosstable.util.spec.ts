import { RoundResult, TournamentEntry } from '../models/tournament.model';
import {
  parseRoundCell,
  performanceRating,
  reconcileByes,
  withPerformanceRatings,
} from './crosstable.util';

const entry = (overrides: Partial<TournamentEntry>): TournamentEntry => ({
  rank: 1,
  playerId: 'player',
  rating: null,
  provisionalGames: null,
  performanceRating: null,
  score: null,
  tiebreak: null,
  rounds: [],
  resultNote: '',
  ...overrides,
});

const game = (
  round: number,
  opponentRank: number | null,
  scores: number[],
): RoundResult => ({
  round,
  outcome: 'game',
  scores,
  points: scores.reduce((total, score) => total + score, 0),
  opponentRank,
  color: null,
});

describe('parseRoundCell', () => {
  it('should read a game with its opponent and color', () => {
    expect(parseRoundCell('W12 (b)', 3, 1)).toEqual({
      round: 3,
      outcome: 'game',
      scores: [1],
      points: 1,
      opponentRank: 12,
      color: 'black',
    });
  });

  it('should read a game with no color recorded', () => {
    expect(parseRoundCell('D5', 1, 1)).toMatchObject({
      outcome: 'game',
      scores: [0.5],
      opponentRank: 5,
      color: null,
    });
  });

  it('should leave the opponent unset when it was not recorded', () => {
    expect(parseRoundCell('L0', 2, 1)).toMatchObject({
      outcome: 'game',
      points: 0,
      opponentRank: null,
    });
  });

  it('should read both games of a round of two', () => {
    expect(parseRoundCell('WL19', 5, 2)).toMatchObject({
      scores: [1, 0],
      points: 1,
      opponentRank: 19,
    });
  });

  it('should read a forfeit', () => {
    expect(parseRoundCell('W23 (-)', 1, 1)).toMatchObject({
      outcome: 'forfeit',
      points: 1,
      opponentRank: 23,
      color: null,
    });
  });

  it('should read byes and unplayed rounds in both notations', () => {
    expect(parseRoundCell('B---', 1, 1)).toMatchObject({
      outcome: 'full-point-bye',
      points: 1,
    });
    expect(parseRoundCell('H— (-)', 2, 1)).toMatchObject({
      outcome: 'half-point-bye',
      points: 0.5,
    });
    expect(parseRoundCell('U---', 3, 1)).toMatchObject({
      outcome: 'unplayed',
      points: 0,
    });
    expect(parseRoundCell('B—', 4, 2)).toMatchObject({ points: 2 });
  });

  it('should reject anything else', () => {
    expect(parseRoundCell('Won', 1, 1)).toBeNull();
    expect(parseRoundCell('W---', 1, 1)).toBeNull();
    expect(parseRoundCell('X12', 1, 1)).toBeNull();
  });
});

describe('reconcileByes', () => {
  const bye = (round: number, points: number): RoundResult => ({
    round,
    outcome: 'full-point-bye',
    scores: [],
    points,
    opponentRank: null,
    color: null,
  });

  it('should keep rounds that already add up to the score', () => {
    const rounds = [bye(1, 2), game(2, 4, [1, 1])];

    expect(reconcileByes(rounds, 4, 2)).toBe(rounds);
  });

  it('should keep rounds when there is no score to check them against', () => {
    const rounds = [bye(1, 2)];

    expect(reconcileByes(rounds, null, 2)).toBe(rounds);
  });

  it('should have nothing to check when only the standings were recorded', () => {
    const rounds: RoundResult[] = [];

    expect(reconcileByes(rounds, 3.5, 1)).toBe(rounds);
  });

  it('should turn byes into half-point byes when that is what the score leaves', () => {
    const rounds = [bye(1, 2), bye(2, 2), game(3, 4, [1, 1])];

    const reconciled = reconcileByes(rounds, 4, 2);

    expect(reconciled?.slice(0, 2)).toEqual([
      { ...bye(1, 1), outcome: 'half-point-bye' },
      { ...bye(2, 1), outcome: 'half-point-bye' },
    ]);
    expect(reconciled?.[2]).toBe(rounds[2]);
  });

  it('should give up when no share of the score fits the byes', () => {
    expect(reconcileByes([bye(1, 2), game(2, 4, [1, 1])], 2.5, 2)).toBeNull();
    expect(reconcileByes([game(1, 4, [1])], 0, 1)).toBeNull();
  });
});

describe('performanceRating', () => {
  it('should add 400 points per game for each win beyond the losses', () => {
    expect(
      performanceRating([
        { opponentRating: 1600, score: 1 },
        { opponentRating: 1400, score: 0.5 },
        { opponentRating: 1500, score: 1 },
        { opponentRating: 1700, score: 0 },
      ]),
    ).toBe(1650);
  });

  it('should have nothing to go on without rated games', () => {
    expect(performanceRating([])).toBeNull();
  });
});

describe('withPerformanceRatings', () => {
  it('should rate each entry by its games against rated opponents', () => {
    const entries = [
      entry({ rank: 1, rating: 1800, rounds: [game(1, 2, [1]), game(2, 3, [1])] }),
      entry({ rank: 2, rating: 1600, rounds: [game(1, 1, [0]), game(2, 3, [0.5])] }),
      entry({ rank: 3, rating: null, rounds: [game(1, null, [0]), game(2, 1, [0])] }),
    ];

    const [first, second, third] = withPerformanceRatings(entries, false, 1);

    expect(first.performanceRating).toBe(2000);
    expect(second.performanceRating).toBe(1400);
    expect(third.performanceRating).toBe(1400);
  });

  it('should leave the rating unset when no game was against a rated opponent', () => {
    const entries = [
      entry({ rank: 1, rating: 1800, rounds: [game(1, 2, [1])] }),
      entry({ rank: 2, rating: null, rounds: [game(1, 1, [0])] }),
    ];

    expect(withPerformanceRatings(entries, false, 1)[0].performanceRating).toBeNull();
  });

  it('should work out a round robin recorded only as standings from the scores', () => {
    const entries = [
      entry({ rank: 1, rating: 1700, score: 3 }),
      entry({ rank: 2, rating: 1500, score: 2 }),
      entry({ rank: 3, rating: 1600, score: 1 }),
    ];

    const [first] = withPerformanceRatings(entries, true, 2);

    expect(first.performanceRating).toBe(1750);
  });

  it('should not guess at standings with an unrated or unfinished entry', () => {
    const entries = [
      entry({ rank: 1, rating: 1700, score: 2 }),
      entry({ rank: 2, rating: null, score: 1 }),
      entry({ rank: 3, rating: 1600, score: null }),
    ];

    expect(
      withPerformanceRatings(entries, true, 1).map(
        ({ performanceRating: rating }) => rating,
      ),
    ).toEqual([null, null, null]);
  });

  it('should not rate standings from a tournament that was not a round robin', () => {
    const entries = [
      entry({ rank: 1, rating: 1700, score: 2 }),
      entry({ rank: 2, rating: 1500, score: 1 }),
    ];

    expect(withPerformanceRatings(entries, false, 1)[0].performanceRating).toBeNull();
  });
});
