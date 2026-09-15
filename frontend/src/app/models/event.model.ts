import { FormControl } from '@angular/forms';

import { EVENT_FORM_DATA_PROPERTIES } from '@app/constants';

import { Id, IsoDate } from './core.model';
import { ModificationInfo } from './modification-info.model';

export type EventType =
  | 'blitz tournament (10 mins)'
  | 'rapid tournament (25 mins)'
  | 'rapid tournament (40 mins)'
  | 'lecture'
  | 'simul'
  | 'championship'
  | 'closed'
  | 'other';

export interface Event {
  id: Id;
  type: EventType;
  eventDate: IsoDate;
  title: string;
  details: string;
  articleId: Id;
  modificationInfo: ModificationInfo;
}

export type EventFormData = Pick<Event, (typeof EVENT_FORM_DATA_PROPERTIES)[number]>;

export type EventFormGroup = {
  [Property in keyof EventFormData]: FormControl<EventFormData[Property]>;
} & { eventTime: FormControl<string> };
