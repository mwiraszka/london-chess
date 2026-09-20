// Members and tournaments are numbered in the club's own sequences, which count up
// from 0, so only digits without a leading zero qualify
export function isRecordNumber(value: unknown): value is string {
  return typeof value === 'string' && /^(0|[1-9]\d*)$/.test(value);
}
