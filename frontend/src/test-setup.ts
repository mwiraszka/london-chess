import { afterEach, vi } from 'vitest';

// Guard against fake-timer leakage between tests (Jest reset these implicitly).
afterEach(() => {
  vi.useRealTimers();
});

// Use defineProperty (not direct assignment) so re-running this setup in a jsdom
// window shared across test files cannot fail with "read only property".

// A real constructor so delayed `new ResizeObserver(...)` calls (scheduled by
// components and fired after a test ends) don't crash the worker.
Object.defineProperty(globalThis, 'ResizeObserver', {
  configurable: true,
  writable: true,
  value: class {
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
  },
});

Object.defineProperty(window, 'matchMedia', {
  configurable: true,
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// jsdom implements no scrolling, so a component that scrolls an element into
// view would throw rather than simply do nothing.
Object.defineProperty(Element.prototype, 'scrollIntoView', {
  configurable: true,
  writable: true,
  value: vi.fn(),
});

globalThis.fail = (reason?: string | Error): never => {
  throw reason instanceof Error ? reason : new Error(reason ?? 'fail() called');
};

globalThis.withDone = (body: (done: DoneFn) => void): Promise<void> =>
  new Promise<void>((resolve, reject) => {
    const done = Object.assign(() => resolve(), {
      fail: (reason?: string | Error) =>
        reject(
          reason instanceof Error ? reason : new Error(reason ?? 'done.fail() called'),
        ),
    }) as DoneFn;
    body(done);
  });

// Silence expected console errors/warnings/logs/infos during tests to reduce noise
const ORIGINAL_CONSOLE_ERROR = console.error;
const ORIGINAL_CONSOLE_WARN = console.warn;
const ORIGINAL_CONSOLE_LOG = console.log;
const ORIGINAL_CONSOLE_INFO = console.info;

const IGNORED_ERROR_PATTERNS: RegExp[] = [
  /\[LCC] Could not parse document load progress data:/, // Document viewer progress edge cases
  /\[LCC] Unable to parse ratings to determine new peak rating/, // Rating util invalid inputs in tests
  /\[LCC] Sort error: property 'key' does not exist/, // custom sort util negative tests
  /\[LCC] Unable to convert data URL and filename to File:/, // dataUrlToFile negative test cases
  /Could not parse CSS stylesheet/, // JSDOM CSS parsing errors with Angular CDK
  /\[LCC].*"name":"LCCError"/, // LCCError test cases (stringified objects)
  /"name":"LCCError"/, // LCCError test cases without prefix
  /NG0304:.*'lcc-markdown-renderer' is not a known element/, // Markdown renderer in test mocks
  /NG0303:.*Can't bind to 'data' since it isn't a known property of 'lcc-markdown-renderer'/, // Markdown renderer binding in test mocks
  /NG0303:.*Can't bind to 'images' since it isn't a known property of 'lcc-markdown-renderer'/, // Markdown renderer binding in test mocks
  /NG0303:.*Can't bind to 'isWideView' since it isn't a known property of 'lcc-markdown-renderer'/, // Markdown renderer binding in test mocks
  /NG0303:.*Can't bind to 'disableSanitizer' since it isn't a known property of 'markdown'/, // Markdown renderer binding in test mocks
  /Cannot read properties of undefined \(reading 'isDarkMode'\)/, // App state selector in tests without mock app state
  /Cannot read properties of undefined \(reading 'isSafeMode'\)/, // App state selector in tests without mock app state
  /Cannot read properties of undefined \(reading 'isDesktopView'\)/, // App state selector in tests without mock app state
  /Cannot read properties of undefined \(reading 'isWideView'\)/, // App state selector in tests without mock app state
  /Cannot read properties of undefined \(reading 'bannerLastCleared'\)/, // App state selector in tests without mock app state
  /Cannot read properties of undefined \(reading 'showUpcomingEventBanner'\)/, // App state selector in tests without mock app state
];

const IGNORED_WARN_PATTERNS: RegExp[] = [
  /\[LCC] Found game with an invalid score/, // PGN viewer test data
  /\[LCC] Found game with an undefined (White|Black) player/, // PGN viewer test data
  /Deprecation warning: value provided is not in a recognized RFC2822 or ISO format/, // moment fallback in tests
  /loadPackages: TypeError \[ERR_VM_DYNAMIC_IMPORT_CALLBACK_MISSING_FLAG]/, // ng2-pdf-viewer dynamic import noise
];

const IGNORED_LOG_PATTERNS: RegExp[] = [
  /Warning: loadPackages: TypeError \[ERR_VM_DYNAMIC_IMPORT_CALLBACK_MISSING_FLAG]/,
];

const IGNORED_INFO_PATTERNS: RegExp[] = [
  /^Request$/, // Logging interceptor request logs
  /\[LCC] Clearing stale data from local storage/, // Meta-reducer version migration logs
  /\[LCC] Removed stale key:/, // Meta-reducer removing old storage keys
  /\[LCC] Welcome to version/, // App version welcome message
];

function shouldIgnore(message: unknown, patterns: RegExp[]): boolean {
  let msg: string;
  if (typeof message === 'string') {
    msg = message.trim();
  } else if (message instanceof Error) {
    msg = message.toString();
  } else if (typeof message === 'object' && message !== null) {
    // Handle objects (like LCCError) by stringifying them
    msg = JSON.stringify(message);
  } else {
    msg = (message?.toString?.() ?? '').trim();
  }
  return patterns.some(p => p.test(msg));
}

console.error = (...args: unknown[]) => {
  if (args.some(arg => shouldIgnore(arg, IGNORED_ERROR_PATTERNS))) {
    return;
  }
  ORIGINAL_CONSOLE_ERROR(...(args as unknown[]));
};

console.warn = (...args: unknown[]) => {
  if (shouldIgnore(args[0], IGNORED_WARN_PATTERNS)) {
    return;
  }
  ORIGINAL_CONSOLE_WARN(...(args as unknown[]));
};

console.log = (...args: unknown[]) => {
  if (shouldIgnore(args[0], IGNORED_LOG_PATTERNS)) {
    return;
  }
  ORIGINAL_CONSOLE_LOG(...(args as unknown[]));
};

console.info = (...args: unknown[]) => {
  if (shouldIgnore(args[0], IGNORED_INFO_PATTERNS)) {
    return;
  }
  ORIGINAL_CONSOLE_INFO(...(args as unknown[]));
};
