import { isEqual } from 'lodash';

import { isDefined } from '../type-guards/is-defined.util';

/**
 * Check whether two values are (deeply) equal.
 */
export function areSame(a: unknown, b: unknown): boolean {
  if (a === null && b === null) {
    return true;
  }

  if (
    (typeof a === 'object' && typeof b !== 'object') ||
    (typeof a !== 'object' && typeof b === 'object')
  ) {
    return false;
  }

  if ((a === null && b !== null) || (a !== null && b === null)) {
    return false;
  }

  if (typeof a !== 'object' && typeof b !== 'object') {
    return a === b;
  }

  if (!isDefined(a) || !isDefined(b)) {
    return false;
  }

  return isEqual(a, b);
}
