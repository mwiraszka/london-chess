import * as moment from 'moment-timezone';

import { Event } from './event.model';

export interface CalendarDay {
  day: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  date: moment.Moment;
  dateKey: string; // Pre-computed date key for tracking
  events: Event[];
}

export interface CalendarMonth {
  monthYear: string;
  hasEvents: boolean;
  isCurrentMonth: boolean;
  weeks: CalendarDay[][];
}
