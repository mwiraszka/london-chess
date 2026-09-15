/**
 * Parse PGN for the game's Encyclopedia of Chess Openings (ECO) code.
 *
 * Return a custom `'X98'` code if it cannot be found.
 */
export function getEcoOpeningCode(pgn?: string): string | undefined {
  if (!pgn) {
    return;
  }

  return pgn.split('[ECO "')[1]?.split('"]')[0] ?? 'X98';
}
