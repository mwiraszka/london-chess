import { isStorageSupported } from './is-storage-supported.util';

describe('isStorageSupported', () => {
  it('handles undefined local storage correctly', () => {
    Object.defineProperty(window, 'localStorage', {
      value: undefined,
      configurable: true,
    });
    expect(isStorageSupported()).toBe(false);
  });

  it('handles undefined session storage correctly', () => {
    Object.defineProperty(window, 'sessionStorage', {
      value: undefined,
      configurable: true,
    });
    expect(isStorageSupported('sessionStorage')).toBe(false);
  });

  it('handles invalid storage correctly', () => {
    Object.defineProperty(window, 'localStorage', {
      value: (() => {
        let storage: { [key: string]: string } = {};
        return {
          getItem: (key: string) => {
            return storage[key];
          },
          clear: () => (storage = {}),
          removeItem: (key: string) => {
            delete storage[key];
          },
        };
      })(),
    });
    expect(isStorageSupported()).toBe(false);
  });

  it('handles valid storage correctly', () => {
    Object.defineProperty(window, 'localStorage', {
      value: (() => {
        let storage: { [key: string]: string } = {};
        return {
          getItem: (key: string) => {
            return storage[key];
          },
          setItem: (key: string, value: string) => {
            storage[key] = value;
          },
          clear: () => (storage = {}),
          removeItem: (key: string) => {
            delete storage[key];
          },
        };
      })(),
    });
    expect(isStorageSupported()).toBe(true);
  });

  it('handles `QuotaExceededError` error correctly', () => {
    Object.defineProperty(window, 'localStorage', {
      value: (() => {
        return {
          setItem: () => {
            throw new DOMException('some message', 'QuotaExceededError');
          },
        };
      })(),
    });
    expect(isStorageSupported()).toBe(true);
  });

  it('handles non-`QuotaExceededError` error correctly', () => {
    Object.defineProperty(window, 'localStorage', {
      value: (() => {
        return {
          setItem: () => {
            throw new DOMException('some message', 'some other error name');
          },
        };
      })(),
    });
    expect(isStorageSupported()).toBe(false);
  });
});
