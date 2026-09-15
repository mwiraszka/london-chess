import { Schema, model } from 'mongoose';

import { Id, IsoDate } from './core.model';
import { ModificationInfo } from './modification-info.model';
import { SortingConfig } from './pagination.model';

export interface Event {
  id: Id;
  eventDate: IsoDate;
  title: string;
  details: string;
  type: string;
  articleId: Id;
  modificationInfo: ModificationInfo;
}

const eventSchema = new Schema<Event>(
  {
    eventDate: { type: String, required: true },
    title: { type: String, required: true },
    details: { type: String, required: true },
    type: { type: String, required: true },
    articleId: { type: String, default: '' },
    modificationInfo: { type: Object, required: true },
  },
  { versionKey: false },
);

export const EventModel = model<Event>('Event', eventSchema);

export const eventTypes: Record<keyof Event, string | string[]> = {
  id: 'string',
  eventDate: 'string',
  title: 'string',
  details: 'string',
  type: 'string',
  articleId: 'string',
  modificationInfo: 'object',
};

export const eventSortingConfig: SortingConfig = {
  fieldMappings: {},
  secondarySort: {
    title: 'eventDate',
    type: 'eventDate',
  },
  searchableFields: [
    'title',
    'details',
    'type',
    'modificationInfo.createdBy',
    'modificationInfo.lastEditedBy',
  ],
};
