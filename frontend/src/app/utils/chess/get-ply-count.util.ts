/**
 * Parse PGN for the game's ply count.
 */
export function getPlyCount(pgn?: string): number | undefined {
  if (!pgn) {
    return;
  }

  const _firstSplit = pgn.split('[PlyCount "');
  if (!_firstSplit?.length || _firstSplit.length < 2) {
    return;
  }

  const plyCount = _firstSplit[1].split('"]')[0];

  return isNaN(Number(plyCount)) ? undefined : Number(plyCount);
}
