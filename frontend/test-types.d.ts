// Ambient test-only globals so spec files can use `fail()` and the Vitest mock
// types without per-file imports. Scoped to tsconfig.spec.json (not the app build).

export {};

declare global {
  type DoneFn = (() => void) & { fail: (reason?: string | Error) => void };

  // eslint-disable-next-line no-var
  var fail: (reason?: string | Error) => never;
  // Bridges the jest `done`-callback style onto Vitest's promise-based tests.
  // eslint-disable-next-line no-var
  var withDone: (body: (done: DoneFn) => void) => Promise<void>;

  type Mock<TReturn = any, TArgs extends any[] = any[]> = import('vitest').Mock<
    (...args: TArgs) => TReturn
  >;
  type Mocked<T> = import('vitest').Mocked<T>;
  type MockInstance<T extends (...args: any[]) => any = (...args: any[]) => any> =
    import('vitest').MockInstance<T>;
}
