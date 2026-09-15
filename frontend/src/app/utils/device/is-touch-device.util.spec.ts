import { isTouchDevice } from './is-touch-device.util';

describe('isTouchDevice', () => {
  let originalMatchMedia: typeof window.matchMedia;

  beforeEach(() => {
    originalMatchMedia = window.matchMedia;
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  it('returns true for touch devices (coarse pointer)', () => {
    Object.defineProperty(window, 'matchMedia', {
      value: vi.fn().mockImplementation(query => ({
        matches: query === '(pointer: coarse)',
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    expect(isTouchDevice()).toBe(true);
  });

  it('returns false for non-touch devices (fine pointer)', () => {
    Object.defineProperty(window, 'matchMedia', {
      value: vi.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    expect(isTouchDevice()).toBe(false);
  });
});
