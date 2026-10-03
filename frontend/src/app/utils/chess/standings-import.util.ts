import {
  EntryInput,
  RoundResultInput,
  SectionInput,
  StandingsImport,
  StandingsSheet,
} from '@app/models';

interface Columns {
  rank: number | null;
  name: number;
  rating: number | null;
  rounds: { column: number; round: number }[];
  score: number | null;
  tiebreak: number | null;
}

interface ParsedSection {
  section: SectionInput | null;
  problems: string[];
}

const RANK_HEADER = /^(#|no\.?|rank|place|pos\.?)$/i;
const NAME_HEADER = /^(name|player)$/i;
const RATING_HEADER = /^(rating|rtg|elo)$/i;
const ROUND_HEADER = /^(?:rd|round|r)\.?\s*(\d{1,2})$/i;
const SCORE_HEADER = /^(total|points|pts|score)$/i;
const TIEBREAK_HEADER = /^t-|buch|tie-?break|sonneborn|cumulative|median/i;

// SwissSys writes a game as W12 (b), a double round as WD12, and "(-)" for a forfeit
const GAME_CELL = /^([WDL]{1,2})\s*(\d+)(?:\s*\(([wb-])\))?$/i;
const FORFEIT_CELL = /^([XF])\s*(\d+)?(?:\s*\([wb-]\))?$/i;
const BYE_CELL = /^([BHUZ])\s*(?:-+|—)?$/i;
const RATING_CELL = /^(\d{1,4})(?:\s*\/\s*(\d{1,3}))?$/;
const UNRATED_CELL = /^(unr\.?|unrated|-+|0)?$/i;

const LETTER_SCORES: Record<string, number> = { W: 1, D: 0.5, L: 0 };

const clean = (cell: string | undefined): string =>
  (cell ?? '').replace(/\s+/g, ' ').trim();

function where(sectionName: string): string {
  return sectionName ? `Section ${sectionName}` : 'The standings';
}

function findColumns(header: string[]): Columns | null {
  const cells = header.map(cell => clean(cell));
  const name = cells.findIndex(cell => NAME_HEADER.test(cell));
  if (name === -1) {
    return null;
  }

  const indexOf = (pattern: RegExp): number | null => {
    const index = cells.findIndex(cell => pattern.test(cell));
    return index === -1 ? null : index;
  };
  const score = indexOf(SCORE_HEADER);
  const tiebreak =
    score === null
      ? null
      : cells.findIndex((cell, index) => index > score && TIEBREAK_HEADER.test(cell));

  return {
    rank: indexOf(RANK_HEADER),
    name,
    rating: indexOf(RATING_HEADER),
    rounds: cells.flatMap((cell, column) => {
      const match = cell.match(ROUND_HEADER);
      return match ? [{ column, round: Number(match[1]) }] : [];
    }),
    score,
    tiebreak: tiebreak === null || tiebreak === -1 ? null : tiebreak,
  };
}

export function parseScore(cell: string): number | null | undefined {
  const value = clean(cell).replace(',', '.');
  if (!value) {
    return null;
  }
  const halves = value.match(/^(\d*)½$/);
  const score = halves ? Number(halves[1] || 0) + 0.5 : Number(value);
  return Number.isFinite(score) && score >= 0 && Number.isInteger(score * 2)
    ? score
    : undefined;
}

export function parseRating(
  cell: string,
): Pick<EntryInput, 'rating' | 'provisionalGames'> | undefined {
  const value = clean(cell);
  if (UNRATED_CELL.test(value)) {
    return { rating: null, provisionalGames: null };
  }
  const match = value.match(RATING_CELL);
  return match
    ? {
        rating: Number(match[1]),
        provisionalGames: match[2] ? Number(match[2]) : null,
      }
    : undefined;
}

/**
 * Reads one round of a player's line: null for an empty cell, a round not yet played,
 * and undefined for anything the importer cannot read.
 */
export function parseRoundCell(
  cell: string,
  round: number,
  roundValue: number,
): RoundResultInput | null | undefined {
  const value = clean(cell);
  if (!value) {
    return null;
  }

  const game = value.match(GAME_CELL);
  if (game) {
    const [, letters, opponent, mark] = game;
    const scores = letters
      .toUpperCase()
      .split('')
      .map(letter => LETTER_SCORES[letter]);
    const points = scores.reduce((total, score) => total + score, 0);
    const color = mark?.toLowerCase();
    return {
      round,
      outcome: color === '-' ? 'forfeit' : 'game',
      scores: color === '-' ? [] : scores,
      points,
      opponentRank: Number(opponent),
      color: color === 'w' ? 'white' : color === 'b' ? 'black' : null,
    };
  }

  const forfeit = value.match(FORFEIT_CELL);
  if (forfeit) {
    return {
      round,
      outcome: 'forfeit',
      scores: [],
      points: forfeit[1].toUpperCase() === 'X' ? roundValue : 0,
      opponentRank: forfeit[2] ? Number(forfeit[2]) : null,
      color: null,
    };
  }

  const bye = value.match(BYE_CELL);
  if (bye) {
    const letter = bye[1].toUpperCase();
    return {
      round,
      outcome:
        letter === 'B'
          ? 'full-point-bye'
          : letter === 'H'
            ? 'half-point-bye'
            : 'unplayed',
      scores: [],
      points: letter === 'B' ? roundValue : letter === 'H' ? roundValue / 2 : 0,
      opponentRank: null,
      color: null,
    };
  }

  return undefined;
}

function isDoubleRound(rows: string[][], columns: Columns): boolean {
  return rows.some(row =>
    columns.rounds.some(({ column }) => {
      const match = clean(row[column]).match(GAME_CELL);
      return !!match && match[1].length === 2;
    }),
  );
}

// Every game is recorded from both sides, so each side must agree with the other
function pairingProblems(section: SectionInput): string[] {
  const byRank = new Map(section.entries.map(entry => [entry.rank, entry]));
  const roundValue = section.isDoubleRound ? 2 : 1;
  const problems: string[] = [];

  for (const entry of section.entries) {
    for (const result of entry.rounds) {
      if (result.opponentRank === null) {
        continue;
      }
      const label = `${where(section.name)}, round ${result.round}: ${entry.name}`;
      const opponent = byRank.get(result.opponentRank);
      if (!opponent) {
        problems.push(
          `${label} is paired with rank ${result.opponentRank}, who is not listed.`,
        );
        continue;
      }
      const reply = opponent.rounds.find(({ round }) => round === result.round);
      if (
        !reply ||
        reply.opponentRank !== entry.rank ||
        reply.points !== roundValue - result.points
      ) {
        problems.push(`${label} and ${opponent.name} do not show the same game.`);
      }
    }
  }
  return problems;
}

function parseSheet(sheet: StandingsSheet, sectionName: string): ParsedSection {
  const headerIndex = sheet.rows.findIndex(row =>
    row.some(cell => NAME_HEADER.test(clean(cell))),
  );
  const columns = headerIndex === -1 ? null : findColumns(sheet.rows[headerIndex]);
  if (!columns) {
    return {
      section: null,
      problems: [
        `${where(sectionName)} has no column headed Name, so its players cannot be found.`,
      ],
    };
  }

  const rows = sheet.rows
    .slice(headerIndex + 1)
    .filter(row => clean(row[columns.name]) !== '');
  if (!rows.length) {
    return { section: null, problems: [`${where(sectionName)} lists no players.`] };
  }

  const doubleRound = isDoubleRound(rows, columns);
  const roundValue = doubleRound ? 2 : 1;
  const roundCount = Math.max(0, ...columns.rounds.map(({ round }) => round));
  const problems: string[] = [];
  const entries: EntryInput[] = [];

  rows.forEach((row, index) => {
    const name = clean(row[columns.name]);
    const line = `${where(sectionName)} (${name})`;

    const rankCell = columns.rank === null ? '' : clean(row[columns.rank]);
    const rank = columns.rank === null ? index + 1 : Number(rankCell.replace(/\.$/, ''));
    if (!Number.isInteger(rank) || rank < 1) {
      problems.push(`${line}: "${rankCell}" is not a rank.`);
      return;
    }

    const ratingCell = columns.rating === null ? '' : clean(row[columns.rating]);
    const rating = parseRating(ratingCell);
    if (!rating) {
      problems.push(`${line}: "${ratingCell}" is not a rating.`);
    }

    const scoreCell = columns.score === null ? '' : clean(row[columns.score]);
    const score = parseScore(scoreCell);
    if (score === undefined) {
      problems.push(`${line}: "${scoreCell}" is not a score.`);
    }

    const tiebreakCell = columns.tiebreak === null ? '' : clean(row[columns.tiebreak]);
    const tiebreak = tiebreakCell === '' ? null : Number(tiebreakCell.replace(',', '.'));

    const rounds: RoundResultInput[] = [];
    let unreadable = false;
    for (const { column, round } of columns.rounds) {
      const result = parseRoundCell(row[column], round, roundValue);
      if (result === undefined) {
        unreadable = true;
        problems.push(
          `${line}, round ${round}: "${clean(row[column])}" is not a result the importer can read.`,
        );
      } else if (result) {
        rounds.push(result);
      }
    }

    const points = rounds.reduce((total, { points }) => total + points, 0);
    if (!unreadable && rounds.length && typeof score === 'number' && points !== score) {
      problems.push(
        `${line}: the rounds add up to ${points}, but the total says ${score}.`,
      );
    }

    entries.push({
      rank,
      name,
      rating: rating?.rating ?? null,
      provisionalGames: rating?.provisionalGames ?? null,
      score: score ?? null,
      tiebreak: tiebreak !== null && Number.isFinite(tiebreak) ? tiebreak : null,
      rounds,
    });
  });

  const duplicates = entries
    .map(({ rank }) => rank)
    .filter((rank, index, ranks) => ranks.indexOf(rank) !== index);
  for (const rank of new Set(duplicates)) {
    problems.push(`${where(sectionName)} lists rank ${rank} more than once.`);
  }

  const section: SectionInput = {
    name: sectionName,
    ratingBand: '',
    roundCount,
    isDoubleRound: doubleRound,
    entries,
  };
  // A line that could not be read would only echo as mismatched pairings
  if (!problems.length) {
    problems.push(...pairingProblems(section));
  }
  return { section: problems.length ? null : section, problems };
}

/**
 * Reads the standings SwissSys exports, one sheet per section. A lone section
 * goes unnamed, as a tournament with a single section is recorded without one.
 */
export function parseStandings(sheets: StandingsSheet[]): StandingsImport {
  const filled = sheets.filter(sheet =>
    sheet.rows.some(row => row.some(cell => clean(cell) !== '')),
  );
  if (!filled.length) {
    return { sections: [], problems: ['The file holds no standings.'] };
  }

  const names = filled.map(sheet => (filled.length === 1 ? '' : clean(sheet.name)));
  const parsed = filled.map((sheet, index) => parseSheet(sheet, names[index]));
  const repeated = names.filter((name, index) => names.indexOf(name) !== index);
  const problems = [
    ...[...new Set(repeated)].map(name => `More than one section is named ${name}.`),
    ...parsed.flatMap(result => result.problems),
  ];
  return {
    sections: problems.length
      ? []
      : parsed.flatMap(({ section }) => (section ? [section] : [])),
    problems,
  };
}
