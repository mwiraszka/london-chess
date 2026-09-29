import {
  EntryInput,
  ROUND_OUTCOMES,
  RoundResult,
  SectionInput,
  TOURNAMENT_FORMATS,
  TournamentInput,
} from '../models/tournament.model';
import { validateObjectByTypes } from './validate-object-by-types.util';

export const tournamentInputTypes: Record<keyof TournamentInput, string | string[]> = {
  name: 'string',
  subtitle: 'string',
  date: 'string',
  endDate: ['string', 'null'],
  format: 'string',
  timeControl: 'string',
  isRated: 'boolean',
  articleUrl: ['string', 'null'],
  registrationOpens: ['string', 'null'],
  registrationCloses: ['string', 'null'],
  sections: ['object', 'null'],
  modificationInfo: 'object',
};

const sectionInputTypes: Record<keyof SectionInput, string | string[]> = {
  name: 'string',
  ratingBand: 'string',
  roundCount: 'number',
  isDoubleRound: 'boolean',
  entries: 'object',
};

const entryInputTypes: Record<keyof EntryInput, string | string[]> = {
  rank: 'number',
  name: 'string',
  rating: ['number', 'null'],
  provisionalGames: ['number', 'null'],
  score: ['number', 'null'],
  tiebreak: ['number', 'null'],
  rounds: 'object',
};

const roundResultTypes: Record<keyof RoundResult, string | string[]> = {
  round: 'number',
  outcome: 'string',
  scores: 'object',
  points: 'number',
  opponentRank: ['number', 'null'],
  color: ['string', 'null'],
};

const MAX_ROUNDS = 30;
const MAX_RATING = 3500;
const SCORES = [0, 0.5, 1];

// A day that does not exist, such as February 30, parses as a later one or not at all
function isDay(value: string): boolean {
  const time = Date.parse(`${value}T00:00:00Z`);
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(time) &&
    new Date(time).toISOString().startsWith(value)
  );
}

const isInstant = (value: string): boolean =>
  !Number.isNaN(Date.parse(value)) && new Date(value).toISOString() === value;

const isWholeNumber = (value: number, min: number, max: number): boolean =>
  Number.isInteger(value) && value >= min && value <= max;

const isHalfPoints = (value: number): boolean =>
  value >= 0 && Number.isInteger(value * 2);

function isHttpUrl(value: string): boolean {
  try {
    return ['http:', 'https:'].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

function roundError(
  result: unknown,
  roundCount: number,
  ranks: Set<number>,
  where: string,
): string | null {
  const typesResult = validateObjectByTypes(result, roundResultTypes);
  if (typesResult !== 'valid') {
    return `${where}: ${typesResult.message}`;
  }

  const { round, outcome, scores, points, opponentRank, color } = result as RoundResult;
  if (!isWholeNumber(round, 1, roundCount)) {
    return `${where} is not one of the section's ${roundCount} rounds`;
  }
  if (!ROUND_OUTCOMES.includes(outcome)) {
    return `${where} has an unknown outcome`;
  }
  if (!Array.isArray(scores) || scores.some(score => !SCORES.includes(score))) {
    return `${where} has invalid game scores`;
  }
  if (!isHalfPoints(points)) {
    return `${where} has invalid points`;
  }
  if (opponentRank !== null && !ranks.has(opponentRank)) {
    return `${where} names an opponent who is not in the section`;
  }
  if (color !== null && color !== 'white' && color !== 'black') {
    return `${where} has an unknown colour`;
  }
  return null;
}

function entryError(
  entry: unknown,
  section: SectionInput,
  ranks: Set<number>,
): string | null {
  const typesResult = validateObjectByTypes(entry, entryInputTypes);
  if (typesResult !== 'valid') {
    return `an entry: ${typesResult.message}`;
  }

  const { rank, name, rating, provisionalGames, score, tiebreak, rounds } =
    entry as EntryInput;
  const where = `rank ${rank}`;
  if (!name.trim()) {
    return `${where} has no player name`;
  }
  if (rating !== null && !isWholeNumber(rating, 0, MAX_RATING)) {
    return `${where} has an invalid rating`;
  }
  if (provisionalGames !== null && !isWholeNumber(provisionalGames, 1, 1000)) {
    return `${where} has an invalid provisional game count`;
  }
  if (score !== null && !isHalfPoints(score)) {
    return `${where} has an invalid score`;
  }
  if (tiebreak !== null && !Number.isFinite(tiebreak)) {
    return `${where} has an invalid tiebreak`;
  }
  if (!Array.isArray(rounds)) {
    return `${where} has no list of rounds`;
  }

  const seenRounds = new Set<number>();
  for (const result of rounds) {
    const error = roundError(result, section.roundCount, ranks, `${where}, a round`);
    if (error) {
      return error;
    }
    if (seenRounds.has((result as RoundResult).round)) {
      return `${where} has round ${(result as RoundResult).round} twice`;
    }
    seenRounds.add((result as RoundResult).round);
  }
  return null;
}

function sectionError(section: unknown, names: Set<string>): string | null {
  const typesResult = validateObjectByTypes(section, sectionInputTypes);
  if (typesResult !== 'valid') {
    return `a section: ${typesResult.message}`;
  }

  const { name, roundCount, entries } = section as SectionInput;
  const where = name ? `section ${name}` : 'the section';
  if (names.has(name)) {
    return `${where} appears twice`;
  }
  names.add(name);
  if (!isWholeNumber(roundCount, 0, MAX_ROUNDS)) {
    return `${where} has an invalid round count`;
  }
  if (!Array.isArray(entries) || !entries.length) {
    return `${where} has no players`;
  }

  const ranks = new Set<number>();
  for (const entry of entries as EntryInput[]) {
    if (typeof entry?.rank !== 'number' || !isWholeNumber(entry.rank, 1, 10_000)) {
      return `${where} has an invalid rank`;
    }
    if (ranks.has(entry.rank)) {
      return `${where} has rank ${entry.rank} twice`;
    }
    ranks.add(entry.rank);
  }

  for (const entry of entries) {
    const error = entryError(entry, section as SectionInput, ranks);
    if (error) {
      return `${where}, ${error}`;
    }
  }
  return null;
}

// Checks the whole tournament, down to every round of every entry, before anything is saved
export function validateTournamentInput(body: unknown): Error | 'valid' {
  const typesResult = validateObjectByTypes(body, tournamentInputTypes);
  if (typesResult !== 'valid') {
    return typesResult;
  }

  const input = body as TournamentInput;
  if (!input.name.trim()) {
    return new Error('the tournament needs a name');
  }
  if (!isDay(input.date)) {
    return new Error('date must be a day written as YYYY-MM-DD');
  }
  if (input.endDate !== null && (!isDay(input.endDate) || input.endDate < input.date)) {
    return new Error('end date must be a day on or after the start date');
  }
  if (!TOURNAMENT_FORMATS.includes(input.format)) {
    return new Error('format is not one the site knows');
  }
  if (input.articleUrl !== null && !isHttpUrl(input.articleUrl)) {
    return new Error('article link must be a web address');
  }

  const { registrationOpens: opens, registrationCloses: closes } = input;
  if ((opens === null) !== (closes === null)) {
    return new Error('registration needs both an opening and a closing time');
  }
  if (opens !== null && closes !== null) {
    if (!isInstant(opens) || !isInstant(closes)) {
      return new Error('registration times must be ISO 8601 instants');
    }
    if (closes <= opens) {
      return new Error('registration must close after it opens');
    }
  }

  if (input.sections !== null) {
    if (!Array.isArray(input.sections)) {
      return new Error('sections must be a list');
    }
    const names = new Set<string>();
    for (const section of input.sections) {
      const error = sectionError(section, names);
      if (error) {
        return new Error(error);
      }
    }
  }

  return 'valid';
}
