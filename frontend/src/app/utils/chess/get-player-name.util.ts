import { isDefined } from '../type-guards/is-defined.util';

/**
 * Parse PGN for one of the two players' names.
 *
 * @param pgn
 * @param name First name only, last name only, or space-separated full name
 * @param color Which player's name to get
 */
export function getPlayerName(
  pgn?: string,
  name?: 'first' | 'last' | 'full',
  color?: 'White' | 'Black',
): string | undefined {
  if (!pgn || !name || !color) {
    return;
  }

  const _firstSplit = pgn.split(`[${color} "`);
  if (!_firstSplit?.length || _firstSplit.length < 2) {
    return;
  }

  const _secondSplit = _firstSplit[1].split('"]')[0];
  if (!isDefined(_secondSplit)) {
    return;
  }

  const [lastName, firstName] = _secondSplit.split(', ');
  if ((name === 'full' && !isDefined(firstName)) || !isDefined(lastName)) {
    return;
  }

  return name === 'first'
    ? firstName
    : name === 'last'
      ? lastName
      : `${firstName} ${lastName}`;
}
