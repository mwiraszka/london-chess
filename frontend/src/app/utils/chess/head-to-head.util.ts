import {
  HeadToHeadGame,
  HeadToHeadGameRow,
  HeadToHeadSide,
  HeadToHeadTally,
  HeadToHeadYear,
  MemberTournamentResult,
  PieceColor,
  SharedTournament,
  SharedTournamentRow,
} from '@app/models';
import { formatDateRange } from '@app/utils/datetime/format-date-range.util';
import { formatPartialDate } from '@app/utils/datetime/format-partial-date.util';

import { formatScore, shortenSubtitle, simulScore } from './crosstable.util';

// Leaves room under each rank for the size of the field
const RANK_WEIGHT = 1000;

export function tallyGames(games: HeadToHeadGame[]): HeadToHeadTally {
  return {
    wins: games.filter(({ score }) => score === 1).length,
    draws: games.filter(({ score }) => score === 0.5).length,
    losses: games.filter(({ score }) => score === 0).length,
  };
}

// The first member's games by the colour they played, leaving out those not recorded
export function tallyByColor(
  games: HeadToHeadGame[],
): Record<PieceColor, HeadToHeadTally> {
  return {
    white: tallyGames(games.filter(({ color }) => color === 'white')),
    black: tallyGames(games.filter(({ color }) => color === 'black')),
  };
}

export function totalPoints(games: HeadToHeadGame[]): Record<HeadToHeadSide, number> {
  const first = games.reduce((total, { score }) => total + score, 0);
  return { first, second: games.length - first };
}

// Oldest first, with every year between the first and the last, so a quiet year shows
export function pointsByYear(games: HeadToHeadGame[]): HeadToHeadYear[] {
  if (!games.length) {
    return [];
  }
  const years = games.map(({ date }) => Number(date.slice(0, 4)));
  const firstYear = Math.min(...years);
  const lastYear = Math.max(...years);
  return Array.from({ length: lastYear - firstYear + 1 }, (_, index) => {
    const year = firstYear + index;
    const { first, second } = totalPoints(games.filter((_game, i) => years[i] === year));
    return { year, firstPoints: first, secondPoints: second };
  });
}

// A simul's rank is its board, which is no place
const isPlaced = ({ tournament }: MemberTournamentResult): boolean =>
  tournament.format !== 'tandem-simul';

/**
 * The tournaments both members played, newest first. Where they played more than one
 * section, as a championship's round robin and its final, the first section they shared
 * is the one compared.
 */
export function sharedTournaments(
  firstResults: MemberTournamentResult[],
  secondResults: MemberTournamentResult[],
): SharedTournament[] {
  const shared: SharedTournament[] = [];
  const seen = new Set<number>();
  for (const result of firstResults) {
    const { number } = result.tournament;
    if (seen.has(number)) {
      continue;
    }
    const theirs = secondResults.filter(other => other.tournament.number === number);
    if (!theirs.length) {
      continue;
    }
    seen.add(number);

    const ours = firstResults.filter(other => other.tournament.number === number);
    const pair = ours
      .map(first => ({
        first,
        second: theirs.find(second => second.section === first.section),
      }))
      .find(({ second }) => !!second);
    const first = pair?.first ?? ours[0];
    const second = pair?.second ?? theirs[0];
    shared.push({
      tournament: result.tournament,
      first,
      second,
      higher:
        pair && isPlaced(first)
          ? first.rank < second.rank
            ? 'first'
            : second.rank < first.rank
              ? 'second'
              : null
          : null,
    });
  }
  return shared.sort(
    (a, b) =>
      b.tournament.date.localeCompare(a.tournament.date) ||
      b.tournament.number - a.tournament.number,
  );
}

export function headToHeadGameRow(
  game: HeadToHeadGame,
  index: number,
  names: Record<HeadToHeadSide, string>,
): HeadToHeadGameRow {
  const round = Number.parseInt(game.round, 10);
  const winner: HeadToHeadSide | null =
    game.score === 1 ? 'first' : game.score === 0 ? 'second' : null;
  return {
    id: `${index}-${game.gameId ?? game.date}`,
    game,
    date: game.date,
    dateLabel: formatPartialDate(game.date, 'short'),
    tournament: game.tournament,
    section: shortenSubtitle(game.section),
    round: Number.isNaN(round) ? null : round,
    roundLabel: game.round,
    white:
      game.color === 'white' ? names.first : game.color === 'black' ? names.second : '',
    winner,
    result: winner ? `${names[winner]} won` : 'Drawn',
  };
}

function placeOf(result: MemberTournamentResult): number | null {
  return isPlaced(result) ? result.rank * RANK_WEIGHT - result.playerCount : null;
}

// Each score out of the points there were to win; a simul board has no place, only its
// one game's result
function finishLabel(result: MemberTournamentResult): string {
  if (!isPlaced(result)) {
    return `${formatScore(simulScore(result.resultNote))}/1`;
  }
  const pointsOnOffer = result.roundCount * (result.isDoubleRound ? 2 : 1);
  return `${result.rank} of ${result.playerCount}, ${formatScore(result.score)}/${pointsOnOffer}`;
}

export function sharedTournamentRow(
  shared: SharedTournament,
  index: number,
): SharedTournamentRow {
  const { tournament, first, second } = shared;
  return {
    id: `${index}-${tournament.number}`,
    shared,
    date: tournament.date,
    dateLabel: formatDateRange(tournament.date, tournament.endDate, 'short'),
    tournament: tournament.name,
    firstPlace: placeOf(first),
    firstLabel: finishLabel(first),
    secondPlace: placeOf(second),
    secondLabel: finishLabel(second),
  };
}
