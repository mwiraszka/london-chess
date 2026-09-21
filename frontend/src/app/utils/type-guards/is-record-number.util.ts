// Club numbers count from 0, so digits without a leading zero
export function isRecordNumber(value: unknown): value is string {
  return typeof value === 'string' && /^(0|[1-9]\d*)$/.test(value);
}
