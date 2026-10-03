import { GAME_RESULTS } from '@app/constants/games';
import {
  GameInput,
  GameResult,
  PgnGame,
  RoundResultInput,
  SectionInput,
  StandingsImport,
  Tournament,
} from '@app/models';

import { playerNameLastFirst } from './player-name.util';

interface Entrant {
  sectionIndex: number;
  rank: number;
}

const TAG_LINE = /^\[(\w+)\s+"((?:[^"\\]|\\.)*)"\]$/;
const ECO_CODE = /^[A-E]\d{2}$/;
const PGN_DATE = /^(\d{4})\.(\d{2})\.(\d{2})$/;

const fold = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z]/g, '');

function splitName(name: string): { first: string; last: string } {
  const comma = name.indexOf(',');
  return comma === -1
    ? { first: '', last: fold(name) }
    : { first: fold(name.slice(comma + 1)), last: fold(name.slice(0, comma)) };
}

// The main line's moves, without move numbers, comments, variations or the result
function countPlies(movetext: string): number {
  let text = movetext.replace(/\{[^}]*\}/g, ' ').replace(/;[^\n]*/g, ' ');
  while (/\([^()]*\)/.test(text)) {
    text = text.replace(/\([^()]*\)/g, ' ');
  }
  return text
    .split(/\s+/)
    .map(token => token.replace(/^\d+\.+/, ''))
    .filter(
      token =>
        token !== '' &&
        !/^\$\d+$/.test(token) &&
        !['1-0', '0-1', '1/2-1/2', '*'].includes(token),
    ).length;
}

function describe(game: PgnGame): string {
  const { White: white = '?', Black: black = '?', Round: round = '?' } = game.tags;
  return `The round ${round} game between ${white} and ${black}`;
}

/**
 * Reads every game of a PGN file: its tags and its movetext, with the comments and
 * variations kept as written.
 */
export function readPgnGames(
  text: string,
  fileName: string,
): { games: PgnGame[]; problems: string[] } {
  const chunks: { tags: Record<string, string>; lines: string[] }[] = [];
  let current: { tags: Record<string, string>; lines: string[] } | null = null;

  for (const line of text.replace(/^\uFEFF/, '').split(/\r?\n/)) {
    const trimmed = line.trim();
    const tag = trimmed.match(TAG_LINE);
    if (tag) {
      // A tag after movetext starts the next game
      if (!current || current.lines.length) {
        current = { tags: {}, lines: [] };
        chunks.push(current);
      }
      current.tags[tag[1]] = tag[2].replace(/\\(.)/g, '$1');
    } else if (trimmed) {
      if (!current) {
        current = { tags: {}, lines: [] };
        chunks.push(current);
      }
      current.lines.push(line);
    }
  }

  if (!chunks.length) {
    return { games: [], problems: [`${fileName} holds no games.`] };
  }

  const problems: string[] = [];
  const games = chunks.map(({ tags, lines }): PgnGame => {
    const movetext = lines.join('\n');
    const game = {
      tags,
      moves: movetext.replace(/\s+/g, ' ').trim(),
      plyCount: countPlies(movetext),
    };
    const declared = tags['PlyCount'];
    if (declared !== undefined && Number(declared) !== game.plyCount) {
      problems.push(
        `${describe(game)} says it has ${declared} half-moves, but ${game.plyCount} were read.`,
      );
    }
    return game;
  });
  return { games, problems };
}

function gameDate(tag: string | undefined, fallback: string): string {
  const match = tag?.match(PGN_DATE);
  return match ? `${match[1]}-${match[2]}-${match[3]}` : fallback;
}

function elo(tag: string | undefined): number | null {
  return tag && /^\d{1,4}$/.test(tag) ? Number(tag) : null;
}

/**
 * Adds a PGN's games to the results a tournament already has. Each game goes to the
 * section its event names and is matched to that section's players, so a name spelt a
 * little differently still finds them. Results already recorded are left as they are,
 * and the archive is only given the games it does not hold yet.
 */
export function mergePgnGames(tournament: Tournament, games: PgnGame[]): StandingsImport {
  const nothing = { sections: [], games: [], knownGameCount: 0 };
  if (!tournament.sections.length) {
    return {
      ...nothing,
      problems: [
        'Games from a PGN can only be added to a tournament whose sections are already recorded.',
      ],
    };
  }

  const sections: SectionInput[] = tournament.sections.map(section => ({
    name: section.name,
    ratingBand: section.ratingBand,
    roundCount: section.roundCount,
    isDoubleRound: section.isDoubleRound,
    entries: section.entries.map(entry => ({
      rank: entry.rank,
      name: playerNameLastFirst(entry.player),
      playerId: entry.player.id,
      rating: entry.rating,
      provisionalGames: entry.provisionalGames,
      score: entry.score,
      tiebreak: entry.tiebreak,
      rounds: entry.rounds.map(
        ({ round, outcome, scores, points, opponentRank, color }): RoundResultInput => ({
          round,
          outcome,
          scores,
          points,
          opponentRank,
          color,
        }),
      ),
    })),
  }));

  // A section's games may be archived under names of their own, such as a joint section
  const labels = tournament.sections.map(
    section =>
      new Set([section.name, ...section.games.map(game => game.section)].filter(Boolean)),
  );
  const archived = new Map<string, GameResult>();
  for (const section of tournament.sections) {
    for (const game of section.games) {
      const round = game.round.match(/^\d+/)?.[0] ?? game.round;
      archived.set(
        `${game.section}|${round}|${game.white.id}|${game.black.id}`,
        game.result,
      );
    }
  }

  const problems: string[] = [];
  const additions = new Map<string, GameInput>();
  let knownGameCount = 0;

  const sectionLabel = (event: string): string | null => {
    const value = event.trim().toLowerCase();
    let best: string | null = null;
    for (const label of labels.flatMap(set => [...set])) {
      const candidate = label.toLowerCase();
      if (
        (value === candidate || value.endsWith(` ${candidate}`)) &&
        (!best || label.length > best.length)
      ) {
        best = label;
      }
    }
    return best;
  };

  const findEntrant = (name: string, sectionIndexes: number[]): Entrant[] => {
    const wanted = splitName(name);
    const candidates = sectionIndexes.flatMap(sectionIndex =>
      sections[sectionIndex].entries.map(entry => ({
        sectionIndex,
        rank: entry.rank,
        ...splitName(entry.name),
      })),
    );
    const exact = candidates.filter(
      ({ first, last }) => last === wanted.last && first === wanted.first,
    );
    if (exact.length) {
      return exact;
    }
    // A shortened first name, such as Jeff for Jeffrey
    return candidates.filter(
      ({ first, last }) =>
        last === wanted.last &&
        !!first &&
        !!wanted.first &&
        (first.startsWith(wanted.first) || wanted.first.startsWith(first)),
    );
  };

  for (const game of games) {
    const label = describe(game);
    const { White: white, Black: black, Result: result, Round: roundTag } = game.tags;
    if (!white || !black) {
      problems.push(`${label} does not name both players.`);
      continue;
    }
    if (!game.plyCount) {
      problems.push(`${label} has no moves.`);
      continue;
    }
    if (!GAME_RESULTS.includes(result as GameResult) || result === '*') {
      problems.push(`${label} has no result.`);
      continue;
    }
    const round = Number(roundTag?.match(/^\d+/)?.[0]);
    if (!Number.isInteger(round) || round < 1) {
      problems.push(`${label} has no round number.`);
      continue;
    }

    const archiveSection =
      sectionLabel(game.tags['Event'] ?? '') ??
      (sections.length === 1 ? ([...labels[0]][0] ?? '') : null);
    if (archiveSection === null) {
      problems.push(
        `${label} is from ${game.tags['Event'] || 'an unnamed event'}, which matches no section of this tournament.`,
      );
      continue;
    }
    const sectionIndexes =
      sections.length === 1
        ? [0]
        : labels.flatMap((set, index) => (set.has(archiveSection) ? [index] : []));

    const players = [white, black].map(name => ({
      name,
      matches: findEntrant(name, sectionIndexes),
    }));
    const unmatched = players.find(({ matches }) => matches.length !== 1);
    if (unmatched) {
      problems.push(
        unmatched.matches.length
          ? `${label}: ${unmatched.name} could be more than one of the section's players.`
          : `${label}: ${unmatched.name} is not one of the players in ${archiveSection ? `section ${archiveSection}` : 'the tournament'}.`,
      );
      continue;
    }

    const [whiteEntrant, blackEntrant] = players.map(({ matches }) => matches[0]);
    const sameSection = whiteEntrant.sectionIndex === blackEntrant.sectionIndex;
    const whiteScore = result === '1-0' ? 1 : result === '0-1' ? 0 : 0.5;
    const sides = [
      {
        entrant: whiteEntrant,
        opponent: blackEntrant,
        score: whiteScore,
        color: 'white',
      },
      {
        entrant: blackEntrant,
        opponent: whiteEntrant,
        score: 1 - whiteScore,
        color: 'black',
      },
    ] as const;

    if (sides.some(({ entrant }) => round > sections[entrant.sectionIndex].roundCount)) {
      problems.push(`${label} is from a round past the section's last.`);
      continue;
    }

    let conflict = false;
    const missing: (typeof sides)[number][] = [];
    for (const side of sides) {
      const entry = sections[side.entrant.sectionIndex].entries.find(
        ({ rank }) => rank === side.entrant.rank,
      )!;
      const recorded = entry.rounds.find(played => played.round === round);
      if (!recorded) {
        missing.push(side);
      } else if (
        recorded.outcome !== 'game' ||
        recorded.points !== side.score ||
        recorded.opponentRank !== (sameSection ? side.opponent.rank : null)
      ) {
        conflict = true;
      }
    }
    if (conflict) {
      problems.push(
        `${label} differs from the result already recorded for round ${round}.`,
      );
      continue;
    }

    for (const side of missing) {
      const entry = sections[side.entrant.sectionIndex].entries.find(
        ({ rank }) => rank === side.entrant.rank,
      )!;
      const played: RoundResultInput = {
        round,
        outcome: 'game',
        scores: [side.score],
        points: side.score,
        opponentRank: sameSection ? side.opponent.rank : null,
        color: side.color,
      };
      entry.rounds = [...entry.rounds, played].sort((a, b) => a.round - b.round);
      entry.score = entry.rounds.reduce((total, { points }) => total + points, 0);
    }

    const whitePlayerId = sections[whiteEntrant.sectionIndex].entries.find(
      ({ rank }) => rank === whiteEntrant.rank,
    )!.playerId!;
    const blackPlayerId = sections[blackEntrant.sectionIndex].entries.find(
      ({ rank }) => rank === blackEntrant.rank,
    )!.playerId!;
    const key = `${archiveSection}|${round}|${whitePlayerId}|${blackPlayerId}`;
    const archivedResult = archived.get(key);
    if (archivedResult !== undefined) {
      if (archivedResult !== result) {
        problems.push(
          `${label} is already in the archive with the result ${archivedResult}.`,
        );
      } else {
        knownGameCount++;
      }
      continue;
    }
    if (additions.has(key)) {
      problems.push(`${label} appears more than once.`);
      continue;
    }
    const eco = game.tags['ECO'] ?? '';
    additions.set(key, {
      section: archiveSection,
      round: String(round),
      date: gameDate(game.tags['Date'], tournament.date),
      whitePlayerId,
      blackPlayerId,
      result: result as GameResult,
      whiteElo: elo(game.tags['WhiteElo']),
      blackElo: elo(game.tags['BlackElo']),
      eco: ECO_CODE.test(eco) ? eco : '',
      plyCount: game.plyCount,
      moves: game.moves,
    });
  }

  if (problems.length) {
    return { ...nothing, problems };
  }
  return {
    sections,
    games: [...additions.values()],
    knownGameCount,
    problems: [],
  };
}
