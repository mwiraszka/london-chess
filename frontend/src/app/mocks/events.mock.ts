import moment from 'moment-timezone';

import { Event } from '@app/models';

import { MOCK_ARTICLES } from './articles.mock';
import { MOCK_MODIFICATION_INFOS } from './modification-info.mock';

export const MOCK_EVENTS: Event[] = [
  {
    id: 'f6a7b8c9d0e1f2a3',
    type: 'blitz tournament (10 mins)',
    title: 'Blitz Tournament on January 1st, 2050',
    eventDate: moment('2050-01-01').toISOString(),
    details: "Come join us for some 10 | 0 blitz on New Year's Day!",
    articleId: '',
    modificationInfo: {
      createdBy: 'Billy Bob',
      createdByNumber: null,
      dateCreated: moment('2049-01-01').toISOString(),
      lastEditedBy: 'Jim Jones',
      lastEditedByNumber: null,
      dateLastEdited: moment('2049-01-15').toISOString(),
    },
  },
  {
    id: 'a7b8c9d0e1f2a3b4',
    type: 'championship',
    title: 'London Chess Club Championship 2050',
    eventDate: moment('2050-03-15').toISOString(),
    details:
      'The annual championship of the London Chess Club. Open to all active members.',
    articleId: MOCK_ARTICLES[1].id,
    modificationInfo: MOCK_MODIFICATION_INFOS[0],
  },
  {
    id: 'b8c9d0e1f2a3b4c5',
    type: 'lecture',
    title: 'Endgame Strategies Workshop',
    eventDate: moment('2050-04-22').toISOString(),
    details: 'Learn essential endgame techniques with Grandmaster Magnus Carlsen.',
    articleId: '',
    modificationInfo: MOCK_MODIFICATION_INFOS[1],
  },
  {
    id: 'c9d0e1f2a3b4c5d6',
    type: 'rapid tournament (25 mins)',
    title: 'Spring Rapid Tournament',
    eventDate: moment('2050-05-10').toISOString(),
    details:
      'Rapid tournament with 25 minute time control. Registration required by May 5th.',
    articleId: MOCK_ARTICLES[2].id,
    modificationInfo: MOCK_MODIFICATION_INFOS[2],
  },
  {
    id: 'd0e1f2a3b4c5d6e7',
    type: 'other',
    title: 'Chess Club Summer BBQ',
    eventDate: moment('2050-07-01').toISOString(),
    details:
      'Annual summer BBQ for all members and their families. Casual blitz games welcome!',
    articleId: MOCK_ARTICLES[3].id,
    modificationInfo: MOCK_MODIFICATION_INFOS[3],
  },
];
