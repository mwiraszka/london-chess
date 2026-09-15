import { has } from 'lodash';

import { isDefined } from '@app/utils';

/**
 * A custom sorting algorithm, primarily intended as a custom sort comparer function to be passed
 * in to NgRx entity adapters. Sorts based on the keys' types, returning `-1` if the first value
 * is less; `0` if equal; and `1` if the first value is greater.
 *
 * @param {unknown} a The first object
 * @param {unknown} b The second object
 * @param {string} primaryKey The primary object property to sort by
 * @param {boolean=} reversePrimarySort Whether to reverse the order of the primary sort
 * (defaults to `false`)
 * @param {string=} secondaryKey An optional secondary object property to sort by in case the
 * first sort returned 0
 * @param {boolean=} reverseSecondarySort Whether to reverse the order of the secondary sort
 * (defaults to `false`)
 *
 */
export function customSort(
  a: unknown,
  b: unknown,
  primaryKey: string,
  reversePrimarySort: boolean | undefined = false,
  secondaryKey?: string,
  reverseSecondarySort: boolean | undefined = false,
): -1 | 0 | 1 {
  const _sort = (a: unknown, b: unknown, key: string): -1 | 0 | 1 => {
    const [nestedObject, ...remainder] = key.split('.');
    const nestedKey = remainder.join('.');

    if (key.includes('.') && has(a, nestedObject) && has(b, nestedObject)) {
      // Call _sort recursively until lowest-level property is reached
      return _sort(a[nestedObject], b[nestedObject], nestedKey);
    }

    if (!has(a, key) || !has(b, key)) {
      console.error(
        `[LCC] Sort error: property '${key}' does not exist on both objects`,
        a,
        b,
      );
      return 0;
    }

    const aVal = a[key as keyof typeof a];
    const bVal = b[key as keyof typeof b];

    if (!isDefined(aVal) && !isDefined(bVal)) {
      return 0;
    }

    if (!isDefined(aVal)) {
      return -1;
    }

    if (!isDefined(bVal)) {
      return 1;
    }

    if (typeof aVal !== typeof bVal) {
      console.error(
        `[LCC] Sort error: cannot compare ${aVal} (${typeof aVal}) with ${bVal} (${typeof bVal}).`,
        a,
        b,
      );
      return 0;
    }

    if (aVal instanceof Date || bVal instanceof Date) {
      console.error(`[LCC] Sort error: JS date object detected while sorting '${key}'`);
      return 0;
    }

    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return aVal < bVal ? -1 : aVal === bVal ? 0 : 1;
    }

    if (typeof aVal === 'boolean' && typeof bVal === 'boolean') {
      return aVal && !bVal ? -1 : !aVal && bVal ? 1 : 0;
    }

    if (typeof aVal !== 'string') {
      console.error(
        `[LCC] Sort error: unknown property type detected while sorting '${key}': '${typeof aVal}'`,
      );
      return 0;
    }

    if (typeof bVal !== 'string') {
      console.error(
        `[LCC] Sort error: unknown property type detected while sorting '${key}': '${typeof bVal}'`,
      );
      return 0;
    }

    if (key === 'albumOrdinality') {
      const aNum = Number(aVal);
      const bNum = Number(bVal);
      return aNum < bNum ? -1 : aNum === bNum ? 0 : 1;
    } else if (['rating', 'peakRating'].includes(key)) {
      const aRating = Number(aVal.split('/')[0]);
      const bRating = Number(bVal.split('/')[0]);

      if (aRating !== bRating) {
        return aRating < bRating ? -1 : 1;
      }

      // If base rating is the same, sort by provisional rating game count
      const aGameCount = Number(aVal.split('/')[1]);
      const bGameCount = Number(bVal.split('/')[1]);

      return isNaN(aGameCount) && isNaN(bGameCount)
        ? 0
        : isNaN(aGameCount)
          ? 1
          : isNaN(bGameCount)
            ? -1
            : aGameCount < bGameCount
              ? -1
              : aGameCount === bGameCount
                ? 0
                : 1;
    } else {
      const aWord = aVal.toUpperCase();
      const bWord = bVal.toUpperCase();
      return aWord < bWord ? -1 : aWord === bWord ? 0 : 1;
    }
  };

  const primarySortResult = _sort(a, b, primaryKey);
  if (primarySortResult !== 0 || !secondaryKey) {
    return reversePrimarySort
      ? ((primarySortResult * -1) as 1 | 0 | -1)
      : primarySortResult;
  }

  const secondarySortResult = _sort(a, b, secondaryKey);
  return reverseSecondarySort
    ? ((secondarySortResult * -1) as 1 | 0 | -1)
    : secondarySortResult;
}
