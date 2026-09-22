import { RoundResult, TournamentEntry } from '@app/models';

import { playerName } from './player-name.util';

const RESULT_LETTERS: Record<number, string> = { 1: 'W', 0.5: 'D', 0: 'L' };

export function formatScore(score: number | null): string {
  if (score === null) {
    return '–';
  }
  const whole = Math.floor(score);
  const half = score - whole === 0.5 ? '½' : '';
  return whole || !half ? `${whole}${half}` : half;
}

// A simul board's result is recorded as a note, whose first word gives the score
export function simulScore(resultNote: string): number | null {
  const [word] = resultNote.trim().toLowerCase().split(/[\s(]/);
  if (['w', 'win', 'won'].includes(word)) {
    return 1;
  }
  if (['d', 'draw', 'drawn'].includes(word)) {
    return 0.5;
  }
  if (['l', 'loss', 'lost'].includes(word)) {
    return 0;
  }
  return null;
}

// The thinking time a control gives, in minutes, taking an increment as a minute per second
export function timeControlMinutes(timeControl: string): number {
  const hours = timeControl.match(/^(\d+) hours?$/);
  if (hours) {
    return Number(hours[1]) * 60;
  }
  const [base, increment] = timeControl.replace(/^G/, '').split('+').map(Number);
  return base + (increment || 0) / 60;
}

// X and F mark forfeits won and lost; B, H and U byes and a round not played
export function roundResultLabel({
  outcome,
  scores,
  points,
  opponentRank,
}: RoundResult): string {
  const opponent = opponentRank ?? '';
  switch (outcome) {
    case 'game':
      return `${scores.map(score => RESULT_LETTERS[score]).join('')}${opponent}`;
    case 'forfeit':
      return `${points ? 'X' : 'F'}${opponent}`;
    case 'full-point-bye':
      return 'B';
    case 'half-point-bye':
      return 'H';
    default:
      return 'U';
  }
}

function gameVerb(score: number): string {
  return score === 1 ? 'Won' : score === 0 ? 'Lost' : 'Drew';
}

export function roundResultDescription(
  { outcome, scores, points, color }: RoundResult,
  opponent: TournamentEntry | null,
): string {
  const against = opponent ? ` against ${playerName(opponent.player)}` : '';
  switch (outcome) {
    case 'game': {
      const [first, second] = scores.map(gameVerb);
      const played = !second
        ? first
        : first === second
          ? `${first} both games`
          : `${first} one and ${second.toLowerCase()} one`;
      return `${played}${color ? ` with ${color}` : ''}${against}.`;
    }
    case 'forfeit':
      return `${points ? 'Won' : 'Lost'} by forfeit${against}.`;
    case 'full-point-bye':
      return 'Full-point bye.';
    case 'half-point-bye':
      return 'Half-point bye.';
    default:
      return 'Did not play this round.';
  }
}

export interface SubtitlePerson {
  // "Last, First", as recorded
  name: string;
  rating: number | null;
}

export interface SubtitlePeople {
  people: SubtitlePerson[];
  separator: string;
}

const PERSON = /^([^,]+), (\D+?)(?: (\d{3,4}))?$/;
const SEPARATORS = /( \/ | vs\. )/;

// Null for a subtitle naming an opening or a theme rather than people
export function parseSubtitlePeople(subtitle: string): SubtitlePeople | null {
  const parts = subtitle.split(SEPARATORS);
  const matches = parts
    .filter((_, index) => index % 2 === 0)
    .map(part => part.match(PERSON));
  if (!matches.every(match => match !== null)) {
    return null;
  }
  return {
    people: matches.map(([, lastName, firstName, rating]) => ({
      name: `${lastName}, ${firstName}`,
      rating: rating ? Number(rating) : null,
    })),
    separator: parts[1] ?? '',
  };
}

export function shortenSubtitle(subtitle: string): string {
  const parsed = parseSubtitlePeople(subtitle);
  if (!parsed) {
    return subtitle;
  }
  return parsed.people
    .map(({ name }) => {
      const [lastName, firstName] = name.split(', ');
      return `${lastName}, ${firstName[0]}.`;
    })
    .join(parsed.separator);
}
