import { combinedLoadStatus, loadStatus } from './load-status.util';

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
