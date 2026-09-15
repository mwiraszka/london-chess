/**
 * A URL to Lichess' analysis board, with only the moves and score portion of the PGN passed in.
 *
 * Returns an empty string if PGN is undefined or no moves exist.
 */
export function getLichessAnalysisUrl(pgn?: string): string | null {
  if (!pgn) {
    return null;
  }

  const moves = pgn.split('"]\n\n')[1]?.replaceAll('\n', ' ');

  return moves?.startsWith('1. ') ? 'https://lichess.org/analysis/pgn/' + moves : null;
}
