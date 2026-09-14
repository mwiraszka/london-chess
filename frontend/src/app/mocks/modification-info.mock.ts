import moment from 'moment-timezone';

import { ModificationInfo } from '@app/models';

export const MOCK_MODIFICATION_INFOS: ModificationInfo[] = [
  {
    createdBy: 'John Doe',
    createdByNumber: 0,
    dateCreated: moment('2025-01-01').toISOString(),
    lastEditedBy: 'John Doe',
    lastEditedByNumber: 0,
    dateLastEdited: moment('2025-01-15').toISOString(),
  },
  {
    createdBy: 'El Presidente',
    createdByNumber: null,
    dateCreated: moment('2025-01-01').toISOString(),
    lastEditedBy: 'El Vice-Presidente',
    lastEditedByNumber: null,
    dateLastEdited: moment('2025-01-03').toISOString(),
  },
  {
    createdBy: 'El Presidente',
    createdByNumber: null,
    dateCreated: moment('2025-01-01T12:00:00').toISOString(),
    lastEditedBy: 'El Presidente',
    lastEditedByNumber: null,
    dateLastEdited: moment('2025-01-02T10:00:00').toISOString(),
  },
  {
    createdBy: 'Jack Sparrow',
    createdByNumber: null,
    dateCreated: moment('2025-01-02T12:00:00').toISOString(),
    lastEditedBy: 'Jack Sparrow',
    lastEditedByNumber: null,
    dateLastEdited: moment('2025-01-02T14:00:00').toISOString(),
  },
  {
    createdBy: 'Jane Smith',
    createdByNumber: null,
    dateCreated: moment('2025-03-03T15:00:00').toISOString(),
    lastEditedBy: 'Jane Smith',
    lastEditedByNumber: null,
    dateLastEdited: moment('2025-03-03T15:00:00').toISOString(),
  },
];
