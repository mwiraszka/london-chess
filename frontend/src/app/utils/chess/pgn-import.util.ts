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

// A comment running to the end of its line becomes a braced one, so the moves still read
// the same once they are joined onto one line
function braceComments(movetext: string): string {
  return movetext.replace(/\{[^}]*\}|;([^\n]*)/g, (match, comment: string | undefined) =>
    comment === undefined ? match : `{${comment.replace(/[{}]/g, '').trim()}}`,
  );
}

// The main line's moves, without move numbers, comments, variations or the result
function countPlies(movetext: string): number {
  let text = movetext.replace(/\{[^}]*\}/g, ' ');
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
 * Reads every finished game of a PGN file: its tags and its movetext, with the comments
 * and variations kept as written. An unfinished game has no result to add yet, so it is
 * left out.
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
      // A tag after movetext, or one the game already has, starts the next game
      if (!current || current.lines.length || Object.hasOwn(current.tags, tag[1])) {
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
  const finished = chunks.filter(({ tags }) => tags['Result'] !== '*');
  const games = finished.map(({ tags, lines }): PgnGame => {
    const movetext = braceComments(lines.join('\n'));
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
    const tokens = movetext
      .replace(/\{[^}]*\}/g, ' ')
      .trim()
      .split(/\s+/);
    const ending = tokens[tokens.length - 1];
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

// A rating of 0 stands for an unrated player
function elo(tag: string | undefined): number | null {
  return tag && /^[1-9]\d{0,3}$/.test(tag) ? Number(tag) : null;
}

// Only a number states a rating; a tag left empty or as "?" says nothing about it
function claimedRating(tag: string | undefined): number | null | undefined {
  return tag && /^\d+$/.test(tag) ? elo(tag) : undefined;
}

const scoreText = (score: number): string => (score === 0.5 ? '½' : String(score));

const ratingText = (rating: number | null): string =>
  rating === null ? 'unrated' : String(rating);

const OUTCOME_TEXT: Record<Exclude<RoundOutcome, 'game'>, string> = {
  forfeit: 'a forfeit',
  'full-point-bye': 'a full-point bye',
  'half-point-bye': 'a half-point bye',
  unplayed: 'unplayed',
};

/**
 * Checks a PGN's games against the results a tournament already has, and gives back the
 * games to add to the archive. Each game goes to the section its event names, and must match
 * the standings for both players exactly: round, opponent, colour, result and rating. The
 * standings are never changed, so any game they disagree with stops the import, for whoever
 * keeps that file to correct it.
 */
export function checkPgnGames(tournament: Tournament, games: PgnGame[]): StandingsImport {
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

  // Games played across two sections are recorded in each against an entry standing in for
  // the other section's players, named after that section
  const placeholderRank = (sectionIndex: number, otherIndex: number): number | null => {
    const standIn = `${sections[otherIndex].name}, player`.toLowerCase();
    return (
      sections[sectionIndex].entries.find(
        ({ name }) => name.trim().toLowerCase() === standIn,
      )?.rank ?? null
    );
  };
  const holdsPlaceholder = (sectionIndex: number): boolean =>
    sections.some(
      (_, otherIndex) =>
        otherIndex !== sectionIndex && placeholderRank(sectionIndex, otherIndex) !== null,
    );

  const knownLabel = (event: string): string | null => {
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

  // The events of the sections already known show what the PGN puts before a section's
  // name, so an event naming games played across sections can be read the same way
  const eventPrefixes = new Set(
    games.flatMap(({ tags }) => {
      const event = (tags['Event'] ?? '').trim();
      const label = knownLabel(event);
      return label && event.length > label.length
        ? [event.slice(0, event.length - label.length).trim()]
        : [];
    }),
  );
  const crossSectionLabel = (event: string): string | null => {
    const value = event.trim();
    const prefix = [...eventPrefixes].find(known =>
      value.toLowerCase().startsWith(`${known.toLowerCase()} `),
    );
    return prefix === undefined ? null : value.slice(prefix.length).trim();
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

  const entryOf = ({ sectionIndex, rank }: Entrant) =>
    sections[sectionIndex].entries.find(entry => entry.rank === rank)!;

  const problems: string[] = [];
  const archived = new Map<string, GameInput>();
  const seen = new Set<string>();

  // How the game is described goes on with either the rest of a sentence about it or a
  // statement after a colon
  const said = (rest: string): string => ` ${rest}`;
  const noted = (statement: string): string => `: ${statement}`;

  // The first way the standings disagree with the game, if any
  const disagreement = (game: PgnGame): string | null => {
    const { White: white, Black: black, Result: result, Round: roundTag } = game.tags;
    if (!white || !black) {
      return said('does not name both players.');
    }
    if (!GAME_RESULTS.includes(result as GameResult) || result === '*') {
      return said('has no result.');
    }
    const round = Number(roundTag?.match(/^\d+/)?.[0]);
    if (!Number.isInteger(round) || round < 1) {
      return said('has no round number.');
    }

    const event = game.tags['Event'] ?? '';
    const unknownEvent = said(
      `is from ${event || 'an unnamed event'}, which matches no section of this tournament.`,
    );
    const label =
      knownLabel(event) ?? (sections.length === 1 ? ([...labels[0]][0] ?? '') : null);
    const crossLabel = label === null ? crossSectionLabel(event) : null;
    if (label === null && crossLabel === null) {
      return unknownEvent;
    }
    const sectionIndexes =
      sections.length === 1
        ? [0]
        : label !== null
          ? labels.flatMap((set, index) => (set.has(label) ? [index] : []))
          : sections.flatMap((_, index) => (holdsPlaceholder(index) ? [index] : []));

    const players = [white, black].map(name => ({
      name,
      matches: findEntrant(name, sectionIndexes),
    }));
    const unmatched = players.find(({ matches }) => matches.length !== 1);
    if (unmatched) {
      return noted(
        unmatched.matches.length
          ? `${unmatched.name} could be more than one of the section's players.`
          : `${unmatched.name} is not one of the players in ${label ? `section ${label}` : 'the tournament'}.`,
      );
    }
    const [whiteEntrant, blackEntrant] = players.map(({ matches }) => matches[0]);
    const sameSection = whiteEntrant.sectionIndex === blackEntrant.sectionIndex;
    if (sameSection && whiteEntrant.rank === blackEntrant.rank) {
      return said('matches both names to the same player.');
    }
    if (
      label === null &&
      (sameSection ||
        placeholderRank(whiteEntrant.sectionIndex, blackEntrant.sectionIndex) === null ||
        placeholderRank(blackEntrant.sectionIndex, whiteEntrant.sectionIndex) === null)
    ) {
      return unknownEvent;
    }

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

    if (
      sides.some(({ entrant }) => {
        const { roundCount, isDoubleRound } = sections[entrant.sectionIndex];
        return round > roundCount * (isDoubleRound ? 2 : 1);
      })
    ) {
      return said("is from a round past the section's last.");
    }

    for (const side of sides) {
      const section = sections[side.entrant.sectionIndex];
      const entry = entryOf(side.entrant);
      // A double round's second game is numbered a whole round count on from its first
      const standingsRound = ((round - 1) % section.roundCount) + 1;
      const gameIndex = Math.floor((round - 1) / section.roundCount);
      const recorded = entry.rounds.find(played => played.round === standingsRound);
      const where = `in round ${standingsRound}`;

      if (!recorded) {
        return noted(`the standings have no result for ${entry.name} ${where}.`);
      }
      if (recorded.outcome !== 'game') {
        return noted(
          `the standings record ${entry.name}'s round ${standingsRound} as ${OUTCOME_TEXT[recorded.outcome]}.`,
        );
      }
      const expectedRanks = sameSection
        ? [side.opponent.rank]
        : [placeholderRank(side.entrant.sectionIndex, side.opponent.sectionIndex), null];
      if (!expectedRanks.includes(recorded.opponentRank)) {
        const recordedOpponent =
          section.entries.find(({ rank }) => rank === recorded.opponentRank)?.name ??
          'a player from another section';
        return noted(
          `the standings pair ${entry.name} with ${recordedOpponent} ${where}, not ${entryOf(side.opponent).name}.`,
        );
      }
      // Each section gives its stand-in's games colours of its own, so only a game within one
      // section can be held to the colours recorded
      if (
        sameSection &&
        gameIndex === 0 &&
        recorded.color &&
        recorded.color !== side.color
      ) {
        return noted(
          `the standings have ${entry.name} playing ${recorded.color} ${where}.`,
        );
      }
      const recordedScore = recorded.scores[gameIndex];
      if (recordedScore === undefined) {
        return noted(`the standings record only one game for ${entry.name} ${where}.`);
      }
      if (recordedScore !== side.score) {
        return noted(
          `the standings give ${entry.name} ${scoreText(recordedScore)} ${where}, but the game gives ${scoreText(side.score)}.`,
        );
      }
      const claimed = claimedRating(
        game.tags[side.color === 'white' ? 'WhiteElo' : 'BlackElo'],
      );
      if (claimed !== undefined && claimed !== entry.rating) {
        return noted(
          `${entry.name} is ${ratingText(claimed)} in the PGN but ${ratingText(entry.rating)} in the standings.`,
        );
      }
    }

    const archiveSection = (label ?? crossLabel) as string;
    const whitePlayerId = entryOf(whiteEntrant).playerId!;
    const blackPlayerId = entryOf(blackEntrant).playerId!;
    // A pairing meets once a round, whichever colours a second listing gives it
    const key = `${archiveSection}|${round}|${[whitePlayerId, blackPlayerId].sort().join('|')}`;
    if (seen.has(key)) {
      return said('appears more than once.');
    }
    seen.add(key);
    // With no moves to replay, the archive gains no game
    if (game.plyCount) {
      const eco = game.tags['ECO'] ?? '';
      archived.set(key, {
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
    return null;
  };

  for (const game of games) {
    const problem = disagreement(game);
    if (problem) {
      problems.push(`${describe(game)}${problem}`);
    }
  }

  if (problems.length) {
    return { ...nothing, problems };
  }
  return { sections, games: [...archived.values()], problems: [] };
}
