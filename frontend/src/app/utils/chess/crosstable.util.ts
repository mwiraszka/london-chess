import { RoundResult, TournamentEntry } from '@app/models';

import { playerName } from './player-name.util';

const RESULT_LETTERS: Record<number, string> = { 1: 'W', 0.5: 'D', 0: 'L' };

// A score with its half point written as a fraction, as crosstables print it
export function formatScore(score: number | null): string {
  if (score === null) {
    return '–';
  }
  const whole = Math.floor(score);
  const half = score - whole === 0.5 ? '½' : '';
  return whole || !half ? `${whole}${half}` : half;
}

/**
 * A round as a crosstable cell shows it: the result of each game and the opponent's
 * rank, X or F and the rank for a forfeit won or lost, and B, H or U for a full-point
 * bye, a half-point bye or a round not played.
 */
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

// A round in words, naming the opponent where the section records them
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
  // As recorded: "Last, First"
  name: string;
  rating: number | null;
}

export interface SubtitlePeople {
  people: SubtitlePerson[];
  // What the subtitle joins the people with, such as " / " or " vs. "
  separator: string;
}

const PERSON = /^([^,]+), (\D+?)(?: (\d{3,4}))?$/;
const SEPARATORS = /( \/ | vs\. )/;

// The players a tournament's subtitle names, with the ratings recorded beside them, or
// null when it names an opening or a theme instead
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

// A subtitle short enough for a table cell: people by surname and initial, without ratings
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
