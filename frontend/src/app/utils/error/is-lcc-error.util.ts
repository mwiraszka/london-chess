import { LccError } from '@app/models';

import { isDefined } from '../type-guards/is-defined.util';
import { isString } from '../type-guards/is-string.util';

export function isLccError(value: unknown): value is LccError {
  return (
    isDefined(value) &&
    typeof value === 'object' &&
    ['name', 'message'].every(
      property =>
        property in value && isString((value as Record<string, unknown>)[property]),
    ) &&
    (value as LccError).name === 'LCCError'
  );
}
