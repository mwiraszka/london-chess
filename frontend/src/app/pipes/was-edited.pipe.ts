import moment from 'moment-timezone';

import { Pipe, PipeTransform } from '@angular/core';

import { ModificationInfo } from '@app/models';
import { isValidIsoDate } from '@app/utils';

/**
 * Check whether dateLastEdited and dateCreated properties on a ModificationInfo object are the same
 * to some level of granularity (defaults to `'day'`).
 *
 * Return `null` if modification info is `null` or `undefined`, or if either date is not a valid
 * ISO 8601 date string.
 */
@Pipe({
  name: 'wasEdited',
})
export class WasEditedPipe implements PipeTransform {
  transform(
    modificationInfo?: ModificationInfo | null,
    granularity: moment.unitOfTime.StartOf = 'day',
  ): boolean | null {
    if (
      !modificationInfo ||
      !isValidIsoDate(modificationInfo.dateCreated) ||
      !isValidIsoDate(modificationInfo.dateLastEdited)
    ) {
      return null;
    }

    return !moment(modificationInfo.dateLastEdited).isSame(
      modificationInfo.dateCreated,
      granularity,
    );
  }
}
