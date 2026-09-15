import { isString } from '../type-guards/is-string.util';

/**
 * Check whether value is a valid time, formatted as `hh:mm A`
 * (e.g. `5:45 PM`, `6:00 am`, or `12:00 PM`).
 */
export function isValidTime(value: unknown): value is string {
  return (
    isString(value) && /^([1-9]|0[1-9]|1[0-2]):[0-5][0-9] ([AP][Mm]|[ap]m)$/.test(value)
  );
}
