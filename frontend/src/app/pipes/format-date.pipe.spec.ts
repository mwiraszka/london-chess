import moment from 'moment-timezone';

import { FormatDatePipe } from './format-date.pipe';

describe('FormatDatePipe', () => {
  const pipe = new FormatDatePipe();

  const currentDate = moment();
  const currentDateLong = currentDate.format('dddd, MMMM Do YYYY [at] h:mm A');

  it('transforms undefined to the current date in "long" format', () => {
    expect(pipe.transform(undefined)).toBe(currentDateLong);
  });

  it('transforms non-date strings to "Invalid date"', () => {
    expect(pipe.transform('')).toBe('Invalid date');
    expect(pipe.transform(' ')).toBe('Invalid date');
    expect(pipe.transform('abc')).toBe('Invalid date');
    expect(pipe.transform('15#d$E*__f15')).toBe('Invalid date');
    expect(pipe.transform('15 15')).toBe('Invalid date');
  });

  it('transforms valid date strings correctly when no `format` provided', () => {
    expect(pipe.transform('1')).toBe('Monday, January 1st 2001 at 12:00 AM');
    expect(pipe.transform('1999')).toBe('Friday, January 1st 1999 at 12:00 AM');
    expect(pipe.transform('2000-01-01')).toBe('Saturday, January 1st 2000 at 12:00 AM');
    expect(pipe.transform('January 15, 1991')).toBe(
      'Tuesday, January 15th 1991 at 12:00 AM',
    );
    expect(pipe.transform(new Date().toISOString())).toBe(currentDateLong);
  });

  it('transforms valid date strings correctly when `format` is explicitly set to "long"', () => {
    expect(pipe.transform('1', 'long')).toBe('Monday, January 1st 2001 at 12:00 AM');
    expect(pipe.transform('1999', 'long')).toBe('Friday, January 1st 1999 at 12:00 AM');
    expect(pipe.transform('2000-01-01', 'long')).toBe(
      'Saturday, January 1st 2000 at 12:00 AM',
    );
    expect(pipe.transform('January 15, 1991', 'long')).toBe(
      'Tuesday, January 15th 1991 at 12:00 AM',
    );
    expect(pipe.transform(new Date().toISOString(), 'long')).toBe(currentDateLong);
  });

  it('transforms valid date strings correctly when `format` is set to "long no-time"', () => {
    expect(pipe.transform('1', 'long no-time')).toBe('Monday, January 1st 2001');
    expect(pipe.transform('1999', 'long no-time')).toBe('Friday, January 1st 1999');
    expect(pipe.transform('2000-01-01', 'long no-time')).toBe(
      'Saturday, January 1st 2000',
    );
    expect(pipe.transform('January 15, 1991', 'long no-time')).toBe(
      'Tuesday, January 15th 1991',
    );
    expect(pipe.transform(new Date().toISOString(), 'long no-time')).toBe(
      currentDate.format('dddd, MMMM Do YYYY'),
    );
  });

  it('transforms valid date strings correctly when `format` is explicitly set to "long month-day-year"', () => {
    expect(pipe.transform('1', 'long month-day-year')).toBe('January 1st, 2001');
    expect(pipe.transform('1999', 'long month-day-year')).toBe('January 1st, 1999');
    expect(pipe.transform('2000-01-01', 'long month-day-year')).toBe('January 1st, 2000');
    expect(pipe.transform('January 15, 1991', 'long month-day-year')).toBe(
      'January 15th, 1991',
    );
    expect(pipe.transform(new Date().toISOString(), 'long month-day-year')).toBe(
      currentDate.format('MMMM Do, YYYY'),
    );
  });

  it('transforms valid date strings correctly when `format` is set to "long day-of-week"', () => {
    expect(pipe.transform('1', 'long day-of-week')).toBe('Monday');
    expect(pipe.transform('1999', 'long day-of-week')).toBe('Friday');
    expect(pipe.transform('2000-01-01', 'long day-of-week')).toBe('Saturday');
    expect(pipe.transform('January 15, 1991', 'long day-of-week')).toBe('Tuesday');
    expect(pipe.transform(new Date().toISOString(), 'long day-of-week')).toBe(
      currentDate.format('dddd'),
    );
  });

  it('transforms valid date strings correctly when `format` is set to "short"', () => {
    expect(pipe.transform('1', 'short')).toBe('Mon, Jan 1, 2001, 12:00 AM');
    expect(pipe.transform('1999', 'short')).toBe('Fri, Jan 1, 1999, 12:00 AM');
    expect(pipe.transform('2000-01-01', 'short')).toBe('Sat, Jan 1, 2000, 12:00 AM');
    expect(pipe.transform('January 15, 1991', 'short')).toBe(
      'Tue, Jan 15, 1991, 12:00 AM',
    );
    expect(pipe.transform(new Date().toISOString(), 'short')).toBe(
      currentDate.format('ddd, MMM D, YYYY, h:mm A'),
    );
  });

  it('transforms valid date strings correctly when `format` is set to "short no-time"', () => {
    expect(pipe.transform('1', 'short no-time')).toBe('Mon, Jan 1, 2001');
    expect(pipe.transform('1999', 'short no-time')).toBe('Fri, Jan 1, 1999');
    expect(pipe.transform('2000-01-01', 'short no-time')).toBe('Sat, Jan 1, 2000');
    expect(pipe.transform('January 15, 1991', 'short no-time')).toBe('Tue, Jan 15, 1991');
    expect(pipe.transform(new Date().toISOString(), 'short no-time')).toBe(
      currentDate.format('ddd, MMM D, YYYY'),
    );
  });

  it('transforms valid date strings correctly when `format` is set to "short month-day"', () => {
    expect(pipe.transform('1', 'short month-day')).toBe('Jan 1');
    expect(pipe.transform('1999', 'short month-day')).toBe('Jan 1');
    expect(pipe.transform('2000-01-01', 'short month-day')).toBe('Jan 1');
    expect(pipe.transform('January 15, 1991', 'short month-day')).toBe('Jan 15');
    expect(pipe.transform(new Date().toISOString(), 'short month-day')).toBe(
      currentDate.format('MMM D'),
    );
  });

  it('transforms valid date strings correctly when `format` is set to "short day-of-week"', () => {
    expect(pipe.transform('1', 'short day-of-week')).toBe('Mon');
    expect(pipe.transform('1999', 'short day-of-week')).toBe('Fri');
    expect(pipe.transform('2000-01-01', 'short day-of-week')).toBe('Sat');
    expect(pipe.transform('January 15, 1991', 'short day-of-week')).toBe('Tue');
    expect(pipe.transform(new Date().toISOString(), 'short day-of-week')).toBe(
      currentDate.format('ddd'),
    );
  });

  it('transforms valid date strings correctly when `format` is set to "year"', () => {
    expect(pipe.transform('1', 'year')).toBe('2001');
    expect(pipe.transform('1999', 'year')).toBe('1999');
    expect(pipe.transform('2000-01-01', 'year')).toBe('2000');
    expect(pipe.transform('January 15, 1991', 'year')).toBe('1991');
    expect(pipe.transform(new Date().toISOString(), 'year')).toBe(
      currentDate.format('YYYY'),
    );
  });

  it('transforms valid date strings correctly when `format` is set to "time"', () => {
    expect(pipe.transform('1', 'time')).toBe('12:00 AM');
    expect(pipe.transform('1999', 'time')).toBe('12:00 AM');
    expect(pipe.transform('2000-01-01', 'time')).toBe('12:00 AM');
    expect(pipe.transform('January 15, 1991', 'time')).toBe('12:00 AM');
    expect(pipe.transform(new Date().toISOString(), 'time')).toBe(
      currentDate.format('h:mm A'),
    );
  });
});
