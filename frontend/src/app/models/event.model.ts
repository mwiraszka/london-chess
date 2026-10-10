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

// The saved event, and the members who could not be emailed about the change to the
// schedule
export interface EventSaveResult {
  id: Id;
  unnotifiedMemberNames: string[];
}

export type EventFormData = Pick<Event, (typeof EVENT_FORM_DATA_PROPERTIES)[number]>;

// The date and time are picked apart and joined back into the event's instant
export type EventFormGroup = {
  [Property in Exclude<keyof EventFormData, 'eventDate'>]: FormControl<
    EventFormData[Property]
  >;
} & {
  eventDay: FormControl<Date | null>;
  eventTime: FormControl<string | null>;
};

export type EventFormValue = Omit<EventFormData, 'eventDate'> & {
  eventDay: Date | null;
  eventTime: string | null;
};
