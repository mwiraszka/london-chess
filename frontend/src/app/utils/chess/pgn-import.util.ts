import { GAME_RESULTS } from '@app/constants/games';
import {
  GameInput,
  GameResult,
  PgnGame,
  RoundOutcome,
  RoundResultInput,
  SectionInput,
  StandingsImport,
  Tournament,
} from '@app/models';

import { isSamePlayerName, playerNameLastFirst } from './player-name.util';

interface Entrant {
  sectionIndex: number;
  rank: number;
}

const TAG_LINE = /^\[(\w+)\s+"((?:[^"\\]|\\.)*)"\]$/;
const ECO_CODE = /^[A-E]\d{2}$/;
const PGN_DATE = /^(\d{4})\.(\d{2})\.(\d{2})$/;
const RESULT_TOKENS = ['1-0', '0-1', '1/2-1/2', '*'];

// SwissSys lists a result without moves as Rated when the game was played but its moves
// went unrecorded, and as Unrated when it was a forfeit
const MOVELESS_OUTCOMES = new Map<string, RoundOutcome>([
  ['Rated', 'game'],
  ['Unrated', 'forfeit'],
]);

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
      token => token !== '' && !/^\$\d+$/.test(token) && !RESULT_TOKENS.includes(token),
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
    // The movetext ends on the result too, and the two must agree
    const ending =
      movetext
        .replace(/\{[^}]*\}/g, ' ')
        .trim()
        .split(/\s+/)
        .pop() ?? '';
    if (RESULT_TOKENS.includes(ending) && tags['Result'] && ending !== tags['Result']) {
      problems.push(
        `${describe(game)} ends its moves with ${ending}, but its Result tag says ${tags['Result']}.`,
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
 * little differently still finds them. A game sets its round's result for both players,
 * so a corrected result replaces the recorded one, while a game that contradicts the
 * recorded pairing stops the import.
 */
export function mergePgnGames(tournament: Tournament, games: PgnGame[]): StandingsImport {
  const nothing = { sections: [], games: [] };
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
  const problems: string[] = [];
  const merged = new Map<string, GameInput>();
  const seen = new Set<string>();

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
    const candidates = sectionIndexes.flatMap(sectionIndex =>
      sections[sectionIndex].entries.map(entry => ({
        sectionIndex,
        rank: entry.rank,
        name: entry.name,
      })),
    );
    const exact = candidates.filter(entrant => isSamePlayerName(entrant.name, name));
    return exact.length
      ? exact
      : candidates.filter(entrant => isSamePlayerName(entrant.name, name, true));
  };

  // A double round's second games wait until every first game is in, so each one finds
  // the result it joins whatever order the file lists them in
  const laterGames: PgnGame[] = [];

  const mergeGame = (game: PgnGame, isLaterPass: boolean): void => {
    const label = describe(game);
    const { White: white, Black: black, Result: result, Round: roundTag } = game.tags;
    if (!white || !black) {
      problems.push(`${label} does not name both players.`);
      return;
    }
    const outcome = game.plyCount
      ? 'game'
      : MOVELESS_OUTCOMES.get(game.tags['ForfeitType'] ?? '');
    if (!outcome) {
      problems.push(`${label} has no moves.`);
      return;
    }
    if (!GAME_RESULTS.includes(result as GameResult) || result === '*') {
      problems.push(`${label} has no result.`);
      return;
    }
    const round = Number(roundTag?.match(/^\d+/)?.[0]);
    if (!Number.isInteger(round) || round < 1) {
      problems.push(`${label} has no round number.`);
      return;
    }

    const archiveSection =
      sectionLabel(game.tags['Event'] ?? '') ??
      (sections.length === 1 ? ([...labels[0]][0] ?? '') : null);
    if (archiveSection === null) {
      problems.push(
        `${label} is from ${game.tags['Event'] || 'an unnamed event'}, which matches no section of this tournament.`,
      );
      return;
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
      return;
    }

    const [whiteEntrant, blackEntrant] = players.map(({ matches }) => matches[0]);
    const sameSection = whiteEntrant.sectionIndex === blackEntrant.sectionIndex;
    const whiteScore = result === '1-0' ? 1 : result === '0-1' ? 0 : 0.5;
    const pairing = [
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

    const sectionOf = ({ sectionIndex }: Entrant) => sections[sectionIndex];
    if (
      pairing.some(({ entrant }) => {
        const { roundCount, isDoubleRound } = sectionOf(entrant);
        return round > roundCount * (isDoubleRound ? 2 : 1);
      })
    ) {
      problems.push(`${label} is from a round past the section's last.`);
      return;
    }
    if (
      outcome === 'forfeit' &&
      pairing.some(({ entrant }) => sectionOf(entrant).isDoubleRound)
    ) {
      problems.push(
        `${label} is a forfeit in a round of two games, which only the standings SwissSys exports can record.`,
      );
      return;
    }
    if (
      !isLaterPass &&
      pairing.some(({ entrant }) => round > sectionOf(entrant).roundCount)
    ) {
      laterGames.push(game);
      return;
    }

    // A double round's second game is numbered a whole round count on from its first
    const sides = pairing.map(side => {
      const { roundCount } = sectionOf(side.entrant);
      return {
        ...side,
        round: ((round - 1) % roundCount) + 1,
        gameIndex: Math.floor((round - 1) / roundCount),
      };
    });

    const entryOf = ({ sectionIndex, rank }: Entrant) =>
      sections[sectionIndex].entries.find(entry => entry.rank === rank)!;
    const recordedRound = (side: (typeof sides)[number]) =>
      entryOf(side.entrant).rounds.find(played => played.round === side.round);
    // A recorded round can take the game's result only when it pairs the same two players
    const contradicted = sides.some(side => {
      const recorded = recordedRound(side);
      return (
        !!recorded &&
        (recorded.outcome !== outcome ||
          recorded.opponentRank !== (sameSection ? side.opponent.rank : null))
      );
    });
    if (contradicted) {
      problems.push(
        `${label} does not match the pairing already recorded for round ${sides[0].round}.`,
      );
      return;
    }
    if (sides.some(side => side.gameIndex > (recordedRound(side)?.scores.length ?? 0))) {
      problems.push(
        `${label} is the second game of round ${sides[0].round}, whose first game is not recorded.`,
      );
      return;
    }

    for (const side of sides) {
      const entry = entryOf(side.entrant);
      const recorded = recordedRound(side);
      const opponentRank = sameSection ? side.opponent.rank : null;
      const scores = recorded ? [...recorded.scores] : [];
      scores[side.gameIndex] = side.score;
      const played: RoundResultInput =
        outcome === 'forfeit'
          ? {
              round: side.round,
              outcome,
              scores: [],
              points: side.score,
              opponentRank,
              color: null,
            }
          : {
              round: side.round,
              outcome,
              scores,
              points: scores.reduce((total, score) => total + score, 0),
              opponentRank,
              // A round keeps the colour of its first game
              color: side.gameIndex === 0 ? side.color : (recorded?.color ?? null),
            };
      entry.rounds = [
        ...entry.rounds.filter(other => other.round !== side.round),
        played,
      ].sort((a, b) => a.round - b.round);
      entry.score = entry.rounds.reduce((total, { points }) => total + points, 0);
    }

    const whitePlayerId = entryOf(whiteEntrant).playerId!;
    const blackPlayerId = entryOf(blackEntrant).playerId!;
    const key = `${archiveSection}|${round}|${whitePlayerId}|${blackPlayerId}`;
    if (seen.has(key)) {
      problems.push(`${label} appears more than once.`);
      return;
    }
    seen.add(key);
    // With no moves to replay, the archive gains no game
    if (!game.plyCount) {
      return;
    }
    const eco = game.tags['ECO'] ?? '';
    merged.set(key, {
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
  };

  games.forEach(game => mergeGame(game, false));
  laterGames.forEach(game => mergeGame(game, true));

  if (problems.length) {
    return { ...nothing, problems };
  }
  return { sections, games: [...merged.values()], problems: [] };
}
