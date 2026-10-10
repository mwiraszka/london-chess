export type DateFormat =
  | 'long'
  | 'long no-time'
  | 'long day-of-week'
  | 'long month-day-year'
  | 'short'
  | 'short at-time'
  | 'short no-time'
  | 'short day-of-week'
  | 'short month-day'
  | 'short month-day-year'
  | 'time'
  | 'year';

export type MonthStyle = 'long' | 'short';

export interface ClubDateTime {
  // Local midnight of the day, as date pickers hold it
  day: Date;
  // HH:mm on a 24-hour clock, as time pickers hold it
  time: string;
}
