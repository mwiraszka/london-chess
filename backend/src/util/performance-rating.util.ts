import { TournamentEntry } from '../models/tournament.model';

interface RatedGame {
  opponentRating: number;
  score: number;
}

type RatedEntry = Pick<TournamentEntry, 'rank' | 'rating' | 'score' | 'rounds'>;

const sum = (values: number[]): number =>
  values.reduce((total, value) => total + value, 0);

// Linear performance: the rated opponents' average plus 400 per net win, per game
export function performanceRating(games: RatedGame[]): number | null {
  if (!games.length) {
    return null;
  }

  const averageRating =
    sum(games.map(({ opponentRating }) => opponentRating)) / games.length;
  const margin = sum(games.map(({ score }) => (score === 1 ? 1 : score === 0 ? -1 : 0)));
  return Math.round(averageRating + (400 * margin) / games.length);
}

// Byes, forfeits and unrated opponents say nothing about playing strength, so they are
// left out. Standings-only round robins are rated from the score, as every entry played
// every other
export function performanceRatings(
  entries: RatedEntry[],
  isRoundRobin: boolean,
  gamesPerPairing: number,
): (number | null)[] {
  const byRank = new Map(entries.map(entry => [entry.rank, entry]));

  return entries.map(entry => {
    if (entry.rounds.length) {
      const games = entry.rounds.flatMap(({ outcome, opponentRank, scores }) => {
        const opponentRating =
          outcome === 'game' && opponentRank !== null
            ? (byRank.get(opponentRank)?.rating ?? null)
            : null;
        return opponentRating === null
          ? []
          : scores.map(score => ({ opponentRating, score }));
      });
      return performanceRating(games);
    }

    const opponents = entries.filter(other => other !== entry);
    const isComplete = opponents.every(
      ({ rating, score }) => rating !== null && score !== null,
    );
    if (!isRoundRobin || entry.score === null || !opponents.length || !isComplete) {
      return null;
    }

    // With every game played, wins minus losses is twice the score less the games
    const gameCount = opponents.length * gamesPerPairing;
    const averageRating =
      sum(opponents.map(({ rating }) => rating ?? 0)) / opponents.length;
    return Math.round(averageRating + (400 * (2 * entry.score - gameCount)) / gameCount);
  });
}
