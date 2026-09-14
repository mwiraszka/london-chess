// Member numbers count up from 0, so only digits without a leading zero qualify
export function isMemberNumber(value: unknown): value is string {
  return typeof value === 'string' && /^(0|[1-9]\d*)$/.test(value);
}
