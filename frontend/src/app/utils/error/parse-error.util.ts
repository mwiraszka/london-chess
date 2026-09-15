import { isEmpty } from 'lodash';

import { HttpErrorResponse } from '@angular/common/http';

import { LccError } from '@app/models';
import { isDefined } from '@app/utils/type-guards/is-defined.util';
import { isString } from '@app/utils/type-guards/is-string.util';

/**
 * Convert error to a common LCC Error type.
 */
export function parseError(error: unknown): LccError {
  if (error instanceof HttpErrorResponse) {
    return {
      name: 'LCCError',
      message: isString(error.error.message)
        ? error.error.message
        : isString(error.message)
          ? error.message
          : 'Unknown HTTP error.',
      status: error.status > 0 ? error.status : undefined,
    };
  }

  if (error instanceof Error) {
    return {
      name: 'LCCError',
      message: error.message,
    };
  }

  if (!isDefined(error) || error === '' || isEmpty(error)) {
    return {
      name: 'LCCError',
      message: 'Empty error.',
    };
  }

  if (isString(error)) {
    return {
      name: 'LCCError',
      message: error,
    };
  }

  return {
    name: 'LCCError',
    message: 'Invalid error.',
  };
}
