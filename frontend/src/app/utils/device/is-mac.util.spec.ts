import { isMac } from './is-mac.util';

describe('isMac', () => {
  it('should return true for Mac platform', () => {
    // Mock navigator.platform for MacOS
    Object.defineProperty(navigator, 'platform', {
      get: () => 'MacIntel',
      configurable: true,
    });

    expect(isMac()).toBe(true);
  });

  it('should return true for iPhone platform', () => {
    // Mock navigator.platform for iPhone
    Object.defineProperty(navigator, 'platform', {
      get: () => 'iPhone',
      configurable: true,
    });

    expect(isMac()).toBe(true);
  });

  it('should return true for iPad platform', () => {
    // Mock navigator.platform for iPad
    Object.defineProperty(navigator, 'platform', {
      get: () => 'iPad',
      configurable: true,
    });

    expect(isMac()).toBe(true);
  });

  it('should return false for Windows platform', () => {
    // Mock navigator.platform for Windows
    Object.defineProperty(navigator, 'platform', {
      get: () => 'Win32',
      configurable: true,
    });

    expect(isMac()).toBe(false);
  });

  it('should return false for Linux platform', () => {
    // Mock navigator.platform for Linux
    Object.defineProperty(navigator, 'platform', {
      get: () => 'Linux x86_64',
      configurable: true,
    });

    expect(isMac()).toBe(false);
  });

  it('should use userAgentData when available', () => {
    // Mock userAgentData for MacOS
    Object.defineProperty(navigator, 'userAgentData', {
      get: () => ({
        platform: 'macOS',
      }),
      configurable: true,
    });

    expect(isMac()).toBe(true);

    // Mock userAgentData for Windows
    Object.defineProperty(navigator, 'userAgentData', {
      get: () => ({
        platform: 'Windows',
      }),
      configurable: true,
    });

    expect(isMac()).toBe(false);
  });

  it('should return false when navigator is undefined', () => {
    // Save original navigator
    const originalNavigator = window.navigator;

    // Replace navigator with undefined
    // @ts-expect-error - Overriding the readonly property for testing
    window.navigator = undefined;

    expect(isMac()).toBe(false);

    // Restore navigator
    window.navigator = originalNavigator;
  });
});
