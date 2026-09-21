import {
  PieceColor,
  RoundOutcome,
  RoundResult,
  TournamentEntry,
} from '../models/tournament.model';

const LETTER_SCORES: Record<string, number> = { W: 1, D: 0.5, L: 0 };

const COLORS: Record<string, PieceColor> = { w: 'white', b: 'black' };

const BYE_OUTCOMES: Record<string, RoundOutcome> = {
  B: 'full-point-bye',
  H: 'half-point-bye',
  U: 'unplayed',
};

const GAME_CELL = /^([WDL]{1,2})(\d+)(?: \(([wb-])\))?$/;
const BYE_CELL = /^([BHU])(?:---|—)(?: \(-\))?$/;

const sum = (values: number[]): number =>
  values.reduce((total, value) => total + value, 0);

// In the pairing software's notation, opponent "0" means not recorded and "(-)" a forfeit
export function parseRoundCell(
  cell: string,
  round: number,
  roundValue: number,
): RoundResult | null {
  const game = cell.match(GAME_CELL);
  if (game) {
    const [, letters, opponent, mark] = game;
    const scores = letters.split('').map(letter => LETTER_SCORES[letter]);
    return {
      round,
      outcome: mark === '-' ? 'forfeit' : 'game',
      scores,
      points: sum(scores),
      opponentRank: opponent === '0' ? null : Number(opponent),
      color: mark ? (COLORS[mark] ?? null) : null,
    };
  }

  const bye = cell.match(BYE_CELL);
  if (bye) {
    const outcome = BYE_OUTCOMES[bye[1]];
    return {
      round,
      outcome,
      scores: [],
      points: byePoints(outcome, roundValue),
      opponentRank: null,
      color: null,
    };
  }

  return null;
}

function byePoints(outcome: RoundOutcome, roundValue: number): number {
  switch (outcome) {
    case 'full-point-bye':
      return roundValue;
    case 'half-point-bye':
      return roundValue / 2;
    default:
      return 0;
  }
}

// Byes in double rounds were sometimes recorded as full-point while scoring one
// point, which only the total reveals
export function reconcileByes(
  rounds: RoundResult[],
  score: number | null,
  roundValue: number,
): RoundResult[] | null {
  if (
    score === null ||
    !rounds.length ||
    sum(rounds.map(({ points }) => points)) === score
  ) {
    return rounds;
  }

  const isBye = ({ outcome }: RoundResult): boolean =>
    outcome === 'full-point-bye' || outcome === 'half-point-bye';
  const byeCount = rounds.filter(isBye).length;
  const otherPoints = sum(
    rounds.filter(round => !isBye(round)).map(({ points }) => points),
  );
  const share = byeCount ? (score - otherPoints) / byeCount : NaN;
  const outcome: RoundOutcome | null =
    share === roundValue
      ? 'full-point-bye'
      : share === roundValue / 2
        ? 'half-point-bye'
        : null;

  if (!outcome) {
    return null;
  }
  return rounds.map(round =>
    isBye(round) ? { ...round, outcome, points: share } : round,
  );
}

interface RatedGame {
  opponentRating: number;
  score: number;
}

export function performanceRating(games: RatedGame[]): number | null {
  if (!games.length) {
    return null;
  }

  const averageRating =
    sum(games.map(({ opponentRating }) => opponentRating)) / games.length;
  const margin = sum(games.map(({ score }) => (score === 1 ? 1 : score === 0 ? -1 : 0)));
  return Math.round(averageRating + (400 * margin) / games.length);
}

// Standings-only round robins are rated from the score, as every entry played every other
export function withPerformanceRatings<
  T extends Pick<
    TournamentEntry,
    'rank' | 'rating' | 'score' | 'rounds' | 'performanceRating'
  >,
>(entries: T[], isRoundRobin: boolean, gamesPerPairing: number): T[] {
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
      return { ...entry, performanceRating: performanceRating(games) };
    }

    const opponents = entries.filter(other => other !== entry);
    const isComplete = opponents.every(
      ({ rating, score }) => rating !== null && score !== null,
    );
    if (!isRoundRobin || entry.score === null || !opponents.length || !isComplete) {
      return { ...entry, performanceRating: null };
    }

    // With every game played, wins minus losses is twice the score less the games
    const gameCount = opponents.length * gamesPerPairing;
    const averageRating =
      sum(opponents.map(({ rating }) => rating ?? 0)) / opponents.length;
    return {
      ...entry,
      performanceRating: Math.round(
        averageRating + (400 * (2 * entry.score - gameCount)) / gameCount,
      ),
    };
  });
}
