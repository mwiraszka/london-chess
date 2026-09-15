import { InjectionToken } from '@angular/core';

import {
  buildImagesFormData,
  dataUrlToFile,
  exportDataToCsv,
  exportEventsToIcal,
  generateUuid,
  getNewPeakRating,
  getPlayerName,
  getScore,
  isExpired,
  isLccError,
  isMac,
  isTouchDevice,
  parseCsv,
  parseError,
  setPaginationParams,
} from '@app/utils';

// Injectable wrappers for free-function utilities so they can be replaced in tests.
// Vitest's builder cannot mock ES module exports, so these are provided via DI instead.

export const PARSE_CSV = new InjectionToken<typeof parseCsv>('PARSE_CSV', {
  factory: () => parseCsv,
});

export const IS_TOUCH_DEVICE = new InjectionToken<typeof isTouchDevice>(
  'IS_TOUCH_DEVICE',
  {
    factory: () => isTouchDevice,
  },
);

export const IS_MAC = new InjectionToken<typeof isMac>('IS_MAC', {
  factory: () => isMac,
});

export const GENERATE_UUID = new InjectionToken<typeof generateUuid>('GENERATE_UUID', {
  factory: () => generateUuid,
});

export const GET_PLAYER_NAME = new InjectionToken<typeof getPlayerName>(
  'GET_PLAYER_NAME',
  {
    factory: () => getPlayerName,
  },
);

export const GET_SCORE = new InjectionToken<typeof getScore>('GET_SCORE', {
  factory: () => getScore,
});

export const EXPORT_EVENTS_TO_ICAL = new InjectionToken<typeof exportEventsToIcal>(
  'EXPORT_EVENTS_TO_ICAL',
  { factory: () => exportEventsToIcal },
);

export const SET_PAGINATION_PARAMS = new InjectionToken<typeof setPaginationParams>(
  'SET_PAGINATION_PARAMS',
  { factory: () => setPaginationParams },
);

export const PARSE_ERROR = new InjectionToken<typeof parseError>('PARSE_ERROR', {
  factory: () => parseError,
});

export const IS_EXPIRED = new InjectionToken<typeof isExpired>('IS_EXPIRED', {
  factory: () => isExpired,
});

export const EXPORT_DATA_TO_CSV = new InjectionToken<typeof exportDataToCsv>(
  'EXPORT_DATA_TO_CSV',
  { factory: () => exportDataToCsv },
);

export const GET_NEW_PEAK_RATING = new InjectionToken<typeof getNewPeakRating>(
  'GET_NEW_PEAK_RATING',
  { factory: () => getNewPeakRating },
);

export const BUILD_IMAGES_FORM_DATA = new InjectionToken<typeof buildImagesFormData>(
  'BUILD_IMAGES_FORM_DATA',
  { factory: () => buildImagesFormData },
);

export const DATA_URL_TO_FILE = new InjectionToken<typeof dataUrlToFile>(
  'DATA_URL_TO_FILE',
  {
    factory: () => dataUrlToFile,
  },
);

export const IS_LCC_ERROR = new InjectionToken<typeof isLccError>('IS_LCC_ERROR', {
  factory: () => isLccError,
});
