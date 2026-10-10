import { DatePickerWeekStart, EaErrorMessages } from '@eagami/ui';

// Matches the schedule's calendar, whose weeks start on Sunday
export const WEEK_STARTS_ON: DatePickerWeekStart = 0;

// How long a form waits for typing to pause before saving its draft to the store
export const FORM_CHANGE_DEBOUNCE = 250;

// Messages for the app's own validators, which the library cannot know
export const FORM_ERROR_MESSAGES: EaErrorMessages = {
  invalidText: 'This contains characters that cannot be saved',
  invalidId: 'Enter a valid 24-character ID',
  invalidOrdinal: 'Enter a whole number from 1 to 99',
  invalidRating: 'Enter a rating such as 1500, or 1500/7 for a provisional rating',
  invalidYearOfBirth: 'Enter a valid year',
  invalidTimeControl: 'Enter a valid time control such as G25, G25+5 or 3 hours',
  invalidRoundCount: 'Enter a whole number of rounds from 1 to 30',
  endBeforeStart: 'The end date cannot come before the start date',
  closesBeforeOpens: 'Registration must close after it opens',
};
