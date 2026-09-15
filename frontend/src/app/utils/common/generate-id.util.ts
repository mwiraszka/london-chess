import { Id } from '@app/models';

import { isDefined } from '../type-guards/is-defined.util';

/**
 * Generate a hexadecimal ID;
 * length defaults to 24 characters if the provided length is invalid or out of range
 */
export function generateId(length?: number): Id {
  length = isDefined(length) && length > 0 && length <= 100 ? length : 24;

  return Array.from({ length }, () => Math.floor(Math.random() * 16))
    .map(i => '0123456789abcdef'.charAt(i))
    .join('');
}
