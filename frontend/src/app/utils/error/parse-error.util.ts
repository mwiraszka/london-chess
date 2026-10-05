import { isEmpty } from 'lodash';

import { HttpErrorResponse } from '@angular/common/http';

import { LccError } from '@app/models';
import { isDefined } from '@app/utils/type-guards/is-defined.util';
import { isRecord } from '@app/utils/type-guards/is-record.util';
import { isString } from '@app/utils/type-guards/is-string.util';

/**
 * Convert error to a common LCC Error type.
 */
export function parseError(error: unknown): LccError {
  if (error instanceof HttpErrorResponse) {
    // A response with an empty body, such as a gateway's, carries no error at all
    const body: unknown = error.error;
    return {
      name: 'LCCError',
      message:
        isRecord(body) && isString(body['message'])
          ? body['message']
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
