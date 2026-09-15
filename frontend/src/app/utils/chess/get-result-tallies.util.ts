import { getScore } from '@app/utils';

/**
 * Return a map of game results mapped to the number of occurrences in the given PGN array.
 */
export function getResultTallies(pgns?: string[]): Map<string, number> | undefined {
  if (!pgns || !pgns.length) {
    return;
  }

  const resultTallies: Map<string, number> = new Map([]);

  for (const pgn of pgns) {
    const score = getScore(pgn, 'White');

    const result =
      score === '1'
        ? 'White wins'
        : score === '0'
          ? 'Black wins'
          : score === '1/2'
            ? 'Draw'
            : score === '*'
              ? 'Inconclusive'
              : 'Unknown';

    const talliesForThisResult = resultTallies.get(result) ?? 0;
    resultTallies.set(result, talliesForThisResult + 1);
  }

  const sortedResultTallies = new Map(
    [...resultTallies.entries()].sort((a, b) => b[1] - a[1]),
  );
  return sortedResultTallies;
}
