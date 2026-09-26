import { InjectionToken } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import {
  buildImagesFormData,
  dataUrlToFile,
  exportDataToCsv,
  exportEventsToIcal,
  generateUuid,
  getNewPeakRating,
  isExpired,
  isLccError,
  isMac,
  isTouchDevice,
  parseCsv,
  parseError,
  setPaginationParams,
} from '@app/utils';

import {
  BUILD_IMAGES_FORM_DATA,
  DATA_URL_TO_FILE,
  EXPORT_DATA_TO_CSV,
  EXPORT_EVENTS_TO_ICAL,
  GENERATE_UUID,
  GET_NEW_PEAK_RATING,
  IS_EXPIRED,
  IS_LCC_ERROR,
  IS_MAC,
  IS_TOUCH_DEVICE,
  PARSE_CSV,
  PARSE_ERROR,
  SET_PAGINATION_PARAMS,
} from './util-fn.tokens';

describe('util function tokens', () => {
  it.each<[string, InjectionToken<object>, object]>([
    ['PARSE_CSV', PARSE_CSV, parseCsv],
    ['IS_TOUCH_DEVICE', IS_TOUCH_DEVICE, isTouchDevice],
    ['IS_MAC', IS_MAC, isMac],
    ['GENERATE_UUID', GENERATE_UUID, generateUuid],
    ['EXPORT_EVENTS_TO_ICAL', EXPORT_EVENTS_TO_ICAL, exportEventsToIcal],
    ['SET_PAGINATION_PARAMS', SET_PAGINATION_PARAMS, setPaginationParams],
    ['PARSE_ERROR', PARSE_ERROR, parseError],
    ['IS_EXPIRED', IS_EXPIRED, isExpired],
    ['EXPORT_DATA_TO_CSV', EXPORT_DATA_TO_CSV, exportDataToCsv],
    ['GET_NEW_PEAK_RATING', GET_NEW_PEAK_RATING, getNewPeakRating],
    ['BUILD_IMAGES_FORM_DATA', BUILD_IMAGES_FORM_DATA, buildImagesFormData],
    ['DATA_URL_TO_FILE', DATA_URL_TO_FILE, dataUrlToFile],
    ['IS_LCC_ERROR', IS_LCC_ERROR, isLccError],
  ])('%s provides the matching utility by default', (_name, token, utilFn) => {
    const provided = TestBed.inject(token);

    expect(provided).toBe(utilFn);
  });
});
