import { IsoDate } from '@app/models';
import moment from '@app/utils/datetime/moment';

import { isValidIsoDate } from './is-valid-iso-date.util';

/**
 * Check whether the provided date is X seconds in the past (defaults to 30 minutes).
 */
export function isExpired(date?: IsoDate | null, seconds = 1800): boolean {
  if (!isValidIsoDate(date)) {
    return true;
  }

  return moment(date).isBefore(moment().subtract(seconds, 'seconds'));
}
