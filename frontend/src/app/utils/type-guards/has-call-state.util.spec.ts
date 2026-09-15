import { CallState } from '@app/models';

import { hasCallState } from './has-call-state.util';

describe('hasCallState', () => {
  const validCallState: CallState = {
    status: 'idle',
    loadStart: null,
    error: null,
  };

  it('should return false for primitive values', () => {
    expect(hasCallState(undefined)).toBe(false);
    expect(hasCallState(null)).toBe(false);
    expect(hasCallState(true)).toBe(false);
    expect(hasCallState(false)).toBe(false);
    expect(hasCallState(15)).toBe(false);
    expect(hasCallState('')).toBe(false);
    expect(hasCallState('abc')).toBe(false);
  });

  it('should return false for objects without callState', () => {
    expect(hasCallState({})).toBe(false);
    expect(hasCallState({ status: 'idle' })).toBe(false);
    expect(hasCallState({ user: null })).toBe(false);
    expect(hasCallState({ data: [], callCount: 0 })).toBe(false);
  });

  it('should return false when callState is null', () => {
    expect(hasCallState({ callState: null })).toBe(false);
  });

  it('should return false when callState is not an object', () => {
    expect(hasCallState({ callState: 'loading' })).toBe(false);
    expect(hasCallState({ callState: 123 })).toBe(false);
    expect(hasCallState({ callState: true })).toBe(false);
    expect(hasCallState({ callState: undefined })).toBe(false);
  });

  it('should return true for objects with valid callState', () => {
    expect(hasCallState({ callState: validCallState })).toBe(true);
  });

  it('should return true for objects with callState and other properties', () => {
    expect(
      hasCallState({
        callState: validCallState,
        user: { id: '123', email: 'test@example.com' },
        hasCode: false,
      }),
    ).toBe(true);
  });

  it('should return true for different callState statuses', () => {
    expect(
      hasCallState({
        callState: { status: 'loading', loadStart: '2025-01-01', error: null },
      }),
    ).toBe(true);

    expect(
      hasCallState({
        callState: {
          status: 'error',
          loadStart: null,
          error: { name: 'Error', message: 'Failed' },
        },
      }),
    ).toBe(true);

    expect(
      hasCallState({
        callState: { status: 'background-loading', loadStart: null, error: null },
      }),
    ).toBe(true);
  });

  it('should narrow type correctly', () => {
    const value: unknown = { callState: validCallState, user: null };

    if (hasCallState(value)) {
      // TypeScript should recognize that value has callState property
      expect(value.callState).toBeDefined();
      expect(value.callState.status).toBe('idle');
    }
  });
});
