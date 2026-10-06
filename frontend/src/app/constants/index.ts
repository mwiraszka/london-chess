import {
  ArticleFormData,
  EventFormData,
  EventType,
  ImageFormData,
  MemberFormData,
} from '@app/models';
import moment from '@app/utils/datetime/moment';

import { CLUB_TIME_ZONE } from './clubs';

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

// Made fresh for each new draft, so it always starts on the current day
export function initialEventFormData(): EventFormData {
  return {
    type: 'blitz tournament (10 mins)',
    eventDate: moment()
      .tz(CLUB_TIME_ZONE, false)
      .set('hours', 18)
      .set('minutes', 0)
      .set('seconds', 0)
      .set('milliseconds', 0)
      .toISOString(),
    title: '',
    details: '',
    articleId: '',
  };
}

export const EVENT_TYPE_OPTIONS: { value: EventType; label: string }[] = [
  { value: 'blitz tournament (10 mins)', label: 'Blitz tournament (10 minutes)' },
  { value: 'rapid tournament (25 mins)', label: 'Rapid tournament (25 minutes)' },
  { value: 'rapid tournament (40 mins)', label: 'Rapid tournament (40 minutes)' },
  { value: 'lecture', label: 'Lecture' },
  { value: 'simul', label: 'Simul' },
  { value: 'championship', label: 'Championship' },
  { value: 'closed', label: 'Closed' },
  { value: 'other', label: 'Other' },
];

export const EVENT_TYPE_COLORS: Record<EventType, string> = {
  'blitz tournament (10 mins)': 'var(--lcc-color--schedule-blitz10TournamentBackground)',
  'rapid tournament (25 mins)': 'var(--lcc-color--schedule-rapid25TournamentBackground)',
  'rapid tournament (40 mins)': 'var(--lcc-color--schedule-rapid40TournamentBackground)',
  lecture: 'var(--lcc-color--schedule-lectureBackground)',
  simul: 'var(--lcc-color--schedule-simulBackground)',
  championship: 'var(--lcc-color--schedule-championshipBackground)',
  closed: 'var(--lcc-color--schedule-closedBackground)',
  other: 'var(--lcc-color--schedule-otherBackground)',
};

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

// Made fresh for each new draft, so a new member joins on the current day
export function initialMemberFormData(): MemberFormData {
  return {
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
}
