import { getEcoOpeningCode } from '@app/utils';

/**
 * Return a map of ECO codes mapped to the number of occurrences in the given array.
 */
export function getOpeningTallies(pgns?: string[]): Map<string, number> | undefined {
  if (!pgns || !pgns.length) {
    return;
  }

  const openingTallies: Map<string, number> = new Map([]);

  for (const pgn of pgns) {
    const ecoOpeningCode = getEcoOpeningCode(pgn);

    if (ecoOpeningCode) {
      const talliesForThisEco = openingTallies.get(ecoOpeningCode) ?? 0;
      openingTallies.set(ecoOpeningCode, talliesForThisEco + 1);
    }
  }

  const sortedOpeningTallies = [...openingTallies.entries()].sort((a, b) => b[1] - a[1]);

  if (sortedOpeningTallies.length <= 10) {
    return new Map(sortedOpeningTallies);
  }

  const otherOpeningTally = sortedOpeningTallies
    .slice(10)
    .reduce((acc, curr) => acc + curr[1], 0);

  const cappedOpeningsTallies = [
    ...sortedOpeningTallies.slice(0, 9),
    ['X99', otherOpeningTally] as [string, number],
  ];

  return new Map(cappedOpeningsTallies);
}
