import { Id } from '@app/models';

import { isString } from './is-string.util';

/**
 * Check whether value is a valid MongoDB ID,
 * used for identifying articles, events, members and images.
 */
export function isCollectionId(value: unknown): value is Id {
  return isString(value) && /^[a-f\d]{24}$/.test(value);
}
