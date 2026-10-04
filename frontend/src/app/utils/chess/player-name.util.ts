import { GamePlayer, GameResult } from '@app/models';

export function playerName({ firstName, lastName, suffix }: GamePlayer): string {
  return [firstName, lastName, suffix].filter(part => part !== '').join(' ');
}

export function playerNameLastFirst({ firstName, lastName, suffix }: GamePlayer): string {
  const given = [firstName, suffix].filter(part => part !== '').join(' ');
  return given ? `${lastName}, ${given}` : lastName;
}

const fold = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z]/g, '');

function nameParts(name: string): { first: string; last: string } {
  const comma = name.indexOf(',');
  return comma === -1
    ? { first: '', last: fold(name) }
    : { first: fold(name.slice(comma + 1)), last: fold(name.slice(0, comma)) };
}

/**
 * Whether two "Last, First" names write the same player, ignoring accents, case and
 * punctuation, and when shortened names are allowed, a first name shortened as Jeff is
 * from Jeffrey.
 */
export function isSamePlayerName(a: string, b: string, allowShortened = false): boolean {
  const one = nameParts(a);
  const other = nameParts(b);
  if (one.last !== other.last) {
    return false;
  }
  if (one.first === other.first) {
    return true;
  }
  return (
    allowShortened &&
    !!one.first &&
    !!other.first &&
    (one.first.startsWith(other.first) || other.first.startsWith(one.first))
  );
}

export type PlayerScore = '1' | '½' | '0' | '*';

export function playerScores(result: GameResult): {
  white: PlayerScore;
  black: PlayerScore;
} {
  switch (result) {
    case '1-0':
      return { white: '1', black: '0' };
    case '0-1':
      return { white: '0', black: '1' };
    case '1/2-1/2':
      return { white: '½', black: '½' };
    default:
      return { white: '*', black: '*' };
  }
}

export function resultLabel(result: GameResult): string {
  switch (result) {
    case '1-0':
      return 'White wins';
    case '0-1':
      return 'Black wins';
    case '1/2-1/2':
      return 'Draw';
    default:
      return 'Unfinished';
  }
}
