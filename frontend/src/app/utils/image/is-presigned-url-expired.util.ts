import moment from 'moment-timezone';

import { IsoDate } from '@app/models';

// Treat a presigned URL as expired if its expiration is less than 2 hours
// away, matching the 2-hour safety buffer the backend bakes into its 12-hour
// URL lifetime (i.e., refresh once the URL is >10 hours old).
const URL_EXPIRY_SAFETY_BUFFER_HOURS = 2;

export function isPresignedUrlExpired(urlExpirationDate?: IsoDate | null): boolean {
  if (!urlExpirationDate) {
    return true;
  }
  return moment(urlExpirationDate).isBefore(
    moment().add(URL_EXPIRY_SAFETY_BUFFER_HOURS, 'hours'),
  );
}
