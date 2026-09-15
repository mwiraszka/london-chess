import { CallState } from '@app/models';

/**
 * Check whether an object has a callState property
 */
export function hasCallState(value: unknown): value is { callState: CallState } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'callState' in value &&
    typeof (value as { callState?: unknown }).callState === 'object' &&
    (value as { callState?: unknown }).callState !== null
  );
}
