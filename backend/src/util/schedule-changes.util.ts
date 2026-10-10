import { Event } from '../models/event.model';
import { CLUB_TIME_ZONE } from './club-date.util';

type ScheduledEvent = Pick<Event, 'eventDate' | 'title' | 'type'>;

export interface ScheduleChange {
  kind: 'added' | 'changed' | 'removed';
  title: string;
  when: string;
  type: string;
  rows: Array<{ label: string; before: string; after: string }>;
}

// What members plan around: when an event is, what it is called and what kind it is
const SCHEDULE_FIELDS: ReadonlyArray<[keyof ScheduledEvent, string]> = [
  ['eventDate', 'Date and time'],
  ['title', 'Title'],
  ['type', 'Type'],
];

// Only events still to come concern anyone, so a change to past ones is no change
export function describeScheduleChange(
  before: ScheduledEvent | null,
  after: ScheduledEvent | null,
  now: Date = new Date(),
): ScheduleChange | null {
  const isUpcoming = (event: ScheduledEvent | null) =>
    !!event && new Date(event.eventDate) >= now;
  if (!isUpcoming(before) && !isUpcoming(after)) {
    return null;
  }
  if (!before) {
    return after ? { kind: 'added', ...summarise(after), rows: [] } : null;
  }
  if (!after) {
    return { kind: 'removed', ...summarise(before), rows: [] };
  }

  const rows = SCHEDULE_FIELDS.flatMap(([field, label]) => {
    const previous = formatField(field, before[field]);
    const next = formatField(field, after[field]);
    return previous === next ? [] : [{ label, before: previous, after: next }];
  });
  return rows.length ? { kind: 'changed', ...summarise(after), rows } : null;
}

function summarise(
  event: ScheduledEvent,
): Pick<ScheduleChange, 'title' | 'when' | 'type'> {
  return {
    title: formatField('title', event.title),
    when: formatField('eventDate', event.eventDate),
    type: formatField('type', event.type),
  };
}

function formatField(field: keyof ScheduledEvent, value: string): string {
  const trimmed = value.trim();
  if (field === 'eventDate') {
    return new Date(trimmed).toLocaleString('en-CA', {
      timeZone: CLUB_TIME_ZONE,
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }
  return field === 'type' ? trimmed.charAt(0).toUpperCase() + trimmed.slice(1) : trimmed;
}
