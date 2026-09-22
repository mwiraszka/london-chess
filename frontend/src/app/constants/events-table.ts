import { Event } from '@app/models';

export const EVENTS_PAGE_SIZES = [10, 20, 50, 100];

// The widest values the events table shows, so its columns are sized before any
// event is fetched
export const WIDEST_EVENT: Event = {
  id: 'widest',
  type: 'rapid tournament (25 mins)',
  title: 'London Chess Club Championship Qualifier, Round 10',
  eventDate: '2000-09-30T23:00:00.000Z',
  details:
    'Registration closes at 6:45 pm, with the first round starting at 7:00 pm sharp.',
  articleId: '',
  modificationInfo: {
    createdBy: '',
    createdByNumber: null,
    dateCreated: '2000-09-30T23:00:00.000Z',
    lastEditedBy: '',
    lastEditedByNumber: null,
    dateLastEdited: '2000-09-30T23:00:00.000Z',
  },
};
