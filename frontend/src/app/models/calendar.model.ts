import { Event } from './event.model';

export interface CalendarDay {
  day: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  dateKey: string;
  events: Event[];
}

export interface CalendarMonth {
  monthYear: string;
  hasEvents: boolean;
  isCurrentMonth: boolean;
  weeks: CalendarDay[][];
}

// One page of the calendar, which pages through months rather than events
export interface CalendarPage {
  months: string[];
  monthCount: number;
  page: number;
  monthsPerPage: number;
  events: Event[];
}
