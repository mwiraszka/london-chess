import moment from 'moment-timezone';

import { Event, LccError } from '@app/models';

/**
 * Export an array of Event objects to an iCal (.ics) file for convenient importing
 * into Google Calendar, Apple Calendar or Outlook
 *
 * @param events - The array of Event objects to export
 * @param filename - The name of the file to create
 *
 * @returns The number of events if the export was successful,
 * or an LccError object if it failed.
 */
export function exportEventsToIcal(events: Event[], filename: string): number | LccError {
  try {
    if (!events.length) {
      return {
        name: 'LCCError' as const,
        message: 'No events available for export',
      };
    }

    const icalHeader = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//London Chess Club//Events Calendar//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
    ].join('\r\n');

    const icalFooter = 'END:VCALENDAR';

    const icalEvents = events.map(event => {
      const eventStart = moment(event.eventDate).utc();
      const eventEnd = eventStart.clone().add(3, 'hours'); // Default 3-hour duration
      const now = moment().utc();

      return [
        'BEGIN:VEVENT',
        `DTSTART:${eventStart.format('YYYYMMDD[T]HHmmss[Z]')}`,
        `DTEND:${eventEnd.format('YYYYMMDD[T]HHmmss[Z]')}`,
        `DTSTAMP:${now.format('YYYYMMDD[T]HHmmss[Z]')}`,
        `UID:${event.id}@londonchessclub.ca`,
        `SUMMARY:${escapeIcalText(event.title)}`,
        `DESCRIPTION:${escapeIcalText(`${event.type}\n\n${event.details}`)}`,
        `LOCATION:London Chess Club`,
        `CATEGORIES:${escapeIcalText(event.type)}`,
        'STATUS:CONFIRMED',
        'TRANSP:OPAQUE',
        'END:VEVENT',
      ].join('\r\n');
    });

    const icalContent = [icalHeader, ...icalEvents, icalFooter].join('\r\n');

    const blob = new Blob([icalContent], { type: 'text/calendar;charset=utf-8;' });
    const link = document.createElement('a');

    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    return events.length;
  } catch {
    return {
      name: 'LCCError',
      message: 'Unknown error occurred while exporting events to iCal',
    };
  }
}

/**
 * Escape special characters in iCal text fields
 */
function escapeIcalText(text: string): string {
  return text
    .replace(/\\n/g, '\n') // Convert literal \n back to actual newlines first
    .replace(/\\/g, '\\\\') // Escape backslashes
    .replace(/;/g, '\\;') // Escape semicolons
    .replace(/,/g, '\\,') // Escape commas
    .replace(/\n/g, '\\n') // Escape actual newlines for iCal
    .replace(/\r/g, ''); // Remove carriage returns
}
