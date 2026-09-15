/**
 * Narrow down type of T by removing `null` and `undefined`.
 */
export function isDefined<T>(value: T & unknown): value is NonNullable<T> {
  return value !== null && value !== undefined;
}
