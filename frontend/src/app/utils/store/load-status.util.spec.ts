import {
  combinedLoadStatus,
  loadStatus,
  withFailedLoad,
  withLoadAttempt,
} from './load-status.util';

describe('loadStatus', () => {
  it('should report loaded data as loaded even after a failed refresh', () => {
    expect(loadStatus(true, false)).toBe('loaded');
    expect(loadStatus(true, true)).toBe('loaded');
  });

  it('should report missing data as loading until its load fails', () => {
    expect(loadStatus(false, false)).toBe('loading');
    expect(loadStatus(false, true)).toBe('failed');
  });
});

describe('combinedLoadStatus', () => {
  it('should report a failure when any load failed', () => {
    expect(combinedLoadStatus('loaded', 'loading', 'failed')).toBe('failed');
  });

  it('should report loading while any load is outstanding', () => {
    expect(combinedLoadStatus('loaded', 'loading')).toBe('loading');
  });

  it('should report loaded once every load has arrived', () => {
    expect(combinedLoadStatus('loaded', 'loaded')).toBe('loaded');
  });
});

describe('withLoadAttempt', () => {
  it('should clear the failure of the load being tried again', () => {
    const state = { failedLoads: ['filtered', 'game'], other: 1 };

    const result = withLoadAttempt(state, 'game');

    expect(result).toEqual({ failedLoads: ['filtered'], other: 1 });
  });
});

describe('withFailedLoad', () => {
  it('should record a failed load once, after any others', () => {
    const state = { failedLoads: ['game', 'filtered'] };

    const result = withFailedLoad(state, 'game');

    expect(result.failedLoads).toEqual(['filtered', 'game']);
  });
});
