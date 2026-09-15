import moment from 'moment-timezone';

import {
  ArticleFormData,
  EventFormData,
  ImageFormData,
  MemberFormData,
} from '@app/models';

export const ARTICLE_FORM_DATA_PROPERTIES = ['title', 'body', 'bannerImageId'] as const;

export const MAX_ARTICLE_BODY_IMAGES = 5;

export const INITIAL_ARTICLE_FORM_DATA: ArticleFormData = {
  title: '',
  body: '',
  bannerImageId: '',
};

export const EVENT_FORM_DATA_PROPERTIES = [
  'type',
  'eventDate',
  'title',
  'details',
  'articleId',
] as const;

export const INITIAL_EVENT_FORM_DATA: EventFormData = {
  type: 'blitz tournament (10 mins)',
  eventDate: moment()
    .tz('America/Toronto', false)
    .set('hours', 18)
    .set('minutes', 0)
    .set('seconds', 0)
    .set('milliseconds', 0)
    .toISOString(),
  title: '',
  details: '',
  articleId: '',
};

export const BASE_IMAGE_PROPERTIES = [
  'id',
  'filename',
  'caption',
  'album',
  'albumCover',
  'albumOrdinality',
  'modificationInfo',
] as const;

export const IMAGE_FORM_DATA_PROPERTIES = [
  'id',
  'filename',
  'caption',
  'album',
  'albumCover',
  'albumOrdinality',
] as const;

export const INITIAL_IMAGE_FORM_DATA: ImageFormData = {
  id: '',
  filename: '',
  caption: '',
  album: '',
  albumCover: false,
  albumOrdinality: '1',
};

export const MEMBER_FORM_DATA_PROPERTIES = [
  'firstName',
  'lastName',
  'rating',
  'peakRating',
  'email',
  'phoneNumber',
  'city',
  'yearOfBirth',
  'chessComUsername',
  'lichessUsername',
  'isActive',
  'dateJoined',
] as const;

export const INITIAL_MEMBER_FORM_DATA: MemberFormData = {
  firstName: '',
  lastName: '',
  city: 'London',
  rating: '1000/0',
  peakRating: '',
  dateJoined: moment().toISOString(),
  isActive: true,
  chessComUsername: '',
  lichessUsername: '',
  yearOfBirth: '',
  email: '',
  phoneNumber: '',
};
